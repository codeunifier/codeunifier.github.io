import { Component, computed, effect, EventEmitter, inject, input, Input, OnDestroy, OnInit, Output, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { CommonModule } from '@angular/common';
import { FormData } from '../../models';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { LocalStorageService } from '../../services/local-storage.service';
import { LocalData } from '../../models/local-data.model';
import { MatExpansionModule } from '@angular/material/expansion';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-form',
  imports: [CommonModule, FormsModule, MatCheckboxModule, MatExpansionModule, MatInputModule, MatSelectModule],
  templateUrl: './form.html',
  styleUrls: ['./form.scss'],
  standalone: true
})
export class FormComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private queryParams = toSignal(this.router.routerState.root.queryParams);

  protected readonly projectName = signal(environment.jiraProjectName);
  protected readonly apiToken = signal(environment.jiraApiToken);
  protected readonly email = signal(environment.jiraAccountEmail);
  protected readonly rememberToken = signal(false);
  protected readonly teams = signal(['Armadillo']);
  protected readonly sprints = signal('');
  protected readonly includeDone = signal(false);
  protected readonly includeExternal = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly formErrors = computed(() => {
    const errors: string[] = [];

    if (!this.projectName().trim() || !this.apiToken() || !this.email().trim() || !this.teams().length || !this.sprints().trim()) {
      errors.push('All fields are required.');
    }

    return errors;
  });

  protected readonly isFormValid = computed(() => {
    return this.formErrors().length === 0;
  });

  protected formData = computed<FormData>(() => ({
    projectName: this.projectName(),
    apiToken: this.apiToken(),
    email: this.email(),
    teams: this.teams(),
    sprints: this.sprints(),
    includeDone: this.includeDone(),
    includeExternal: this.includeExternal(),
  }));

  isLoading = input<boolean>(false);

  @Input() disableSubmit: boolean = false;

  @Output() formSubmit = new EventEmitter<FormData>();

  private destroy$ = new Subject<void>();

  private isInitialized = false;

  constructor(
    private localStorageService: LocalStorageService,
  ) {
    effect(() => {
      // sync the form values with the query params
      const formData = this.formData();
      
      if (!this.isInitialized) {
        // subscribes to the queryParams signal
        this.loadQueryParamsFromSnapshot();
        return;
      }
      
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {
          teams: formData.teams.join(','),
          sprints: formData.sprints,
          includeDone: formData.includeDone,
          includeExternal: formData.includeExternal,
        },
        queryParamsHandling: 'merge',
      });
    })
  }

  ngOnInit(): void {
    const localData = this.localStorageService.getFromLocalStorage();
    this.initFromLocalData(localData);
  }

  private initFromLocalData(localData?: LocalData): void {
    this.projectName.set(localData?.projectName || '');
    this.apiToken.set(localData?.apiToken || '');
    this.email.set(localData?.email || '');
    if (localData) {
      this.rememberToken.set(true);
    }
  }

  private loadQueryParamsFromSnapshot(): void {
    const params = this.queryParams();

    if (!params || Object.keys(params).length === 0) return;

    this.isInitialized = true;

    console.log('Query params:', params);
    
    const teams = params['teams'];
    const sprints = params['sprints'];
    const includeDone = params['includeDone'];
    const includeExternal = params['includeExternal'];

    if (teams) {
      this.teams.set(teams.split(','));
    }
    if (sprints) {
      this.sprints.set(sprints);
    }
    if (includeDone) {
      this.includeDone.set(includeDone === 'true');
    }
    if (includeExternal) {
      this.includeExternal.set(includeExternal === 'true');
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    if (this.rememberToken()) {
      this.localStorageService.saveToLocalStorage(this.formData());
    } else {
      this.localStorageService.clearLocalStorage();
    }

    this.formSubmit.emit(this.formData());
  }
}
