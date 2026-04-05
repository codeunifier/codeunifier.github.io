import { Component, computed, effect, EventEmitter, input, Input, OnDestroy, OnInit, Output, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, FormsModule } from '@angular/forms';
import { FormData } from '../../models';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { LocalStorageService } from '../../services/local-storage.service';
import { LocalData } from '../../models/local-data.model';
import { MatExpansionModule } from '@angular/material/expansion';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-form',
  imports: [CommonModule, FormsModule, MatCheckboxModule, MatExpansionModule, MatInputModule, MatSelectModule],
  templateUrl: './form.html',
  styleUrls: ['./form.scss'],
  standalone: true
})
export class FormComponent implements OnInit, OnDestroy {
  myForm!: FormGroup;

  protected readonly projectName = signal(environment.jiraProjectName);
  protected readonly apiToken = signal(environment.jiraApiToken);
  protected readonly email = signal(environment.jiraAccountEmail);
  protected readonly rememberToken = signal(false);
  protected readonly teams = signal(['Armadillo']);
  protected readonly sprints = signal('');
  protected readonly includeDone = signal(false);
  protected readonly includeExternal = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly formValue = computed(() => ({
    projectName: this.projectName(),
    apiToken: this.apiToken(),
    email: this.email(),
    teams: this.teams(),
    sprints: this.sprints(),
    includeDone: this.includeDone(),
    includeExternal: this.includeExternal(),
  }));

  protected readonly formErrors = computed(() => {
    const errors: string[] = [];

    const formData = this.formValue();

    if (!formData.projectName.trim() || !formData.apiToken || !formData.email.trim() || !formData.teams.length || !formData.sprints.trim()) {
      errors.push('All fields are required.');
    }

    return errors;
  });

  protected readonly isFormValid = computed(() => {
    return this.formErrors().length === 0;
  });

  isLoading = input<boolean>(false);

  @Input() disableSubmit: boolean = false;

  @Output() formSubmit = new EventEmitter<FormData>();

  private destroy$ = new Subject<void>();

  private isInitialized = false;

  constructor(
    private localStorageService: LocalStorageService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    effect(() => {
      // sync the form values with the query params
      const formData = this.formValue();
      
      if (!this.isInitialized) {
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
    this.initForm();
    this.initQueryParamSync();

    setTimeout(() => this.isInitialized = true, 0);
  }

  private initFromLocalData(localData?: LocalData): void {
    this.projectName.set(localData?.projectName || '');
    this.apiToken.set(localData?.apiToken || '');
    this.email.set(localData?.email || '');
    if (localData) {
      this.rememberToken.set(true);
    }
  }

  private initForm(): void {
    this.myForm = new FormGroup({
      projectName: new FormControl(this.projectName()),
      apiToken: new FormControl(this.apiToken()),
      email: new FormControl(this.email()),
      teams: new FormControl(this.teams()),
      sprints: new FormControl(this.sprints()),
      includeDone: new FormControl(this.includeDone()),
      includeExternal: new FormControl(this.includeExternal()),
    });
  }

  private initQueryParamSync(): void {
    this.route.queryParamMap
      .pipe(
        takeUntil(this.destroy$)
      )
      .subscribe((params) => {
        const teams = params.get('teams');
        const sprints = params.get('sprints');
        const includeDone = params.get('includeDone');
        const includeExternal = params.get('includeExternal');

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

        if (teams && sprints) {
          this.onSubmit();
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    if (this.rememberToken()) {
      this.localStorageService.saveToLocalStorage(this.formValue());
    } else {
      this.localStorageService.clearLocalStorage();
    }

    this.formSubmit.emit(this.formValue());
  }
}
