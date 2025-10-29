import { Component, computed, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, FormsModule } from '@angular/forms';
import { FormData } from '../../models';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-form',
  imports: [CommonModule, FormsModule, MatInputModule, MatSelectModule],
  templateUrl: './form.html',
  styleUrls: ['./form.scss'],
  standalone: true
})
export class FormComponent implements OnInit {
  myForm!: FormGroup;

  protected readonly projectName = signal(environment.jiraProjectName);
  protected readonly apiToken = signal(environment.jiraApiToken);
  protected readonly email = signal(environment.jiraAccountEmail);
  protected readonly teams = signal(['Armadillo']);
  protected readonly sprints = signal('');
  protected readonly errorMessage = signal('');

  protected readonly formValue = computed(() => ({
    projectName: this.projectName(),
    apiToken: this.apiToken(),
    email: this.email(),
    teams: this.teams(),
    sprints: this.sprints()
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

  @Input() disableSubmit: boolean = false;

  @Output() formSubmit = new EventEmitter<FormData>();

  ngOnInit(): void {
    this.initForm();
  }

  private initForm(): void {
    this.myForm = new FormGroup({
      projectName: new FormControl(this.projectName()),
      apiToken: new FormControl(this.apiToken()),
      email: new FormControl(this.email()),
      teams: new FormControl(this.teams()),
      sprints: new FormControl(this.sprints())
    });
  }

  validateAndSubmit(): void {
    // this.errorMessage.set('');

    // const projectNameValue = this.projectName().trim() || environment.jiraProjectName || '';
    // const apiTokenValue = this.apiToken() || environment.jiraApiToken || '';
    // const emailValue = this.email().trim();
    // const teamsValue = this.teams();
    // const sprintsValue = this.sprints().trim();

    // if (!projectNameValue || !apiTokenValue || !emailValue || !teamsValue.length || !sprintsValue) {
    //   this.errorMessage.set('Please fill in all fields');
    //   return;
    // }

    // const formData: FormData = {
    //   projectName: projectNameValue,
    //   apiToken: apiTokenValue,
    //   email: emailValue,
    //   teams: teamsValue,
    //   sprints: sprintsValue
    // };

    this.formSubmit.emit(this.formValue());
  }
}
