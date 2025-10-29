import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormData } from '../../models';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-form',
  imports: [CommonModule, FormsModule, MatInputModule, MatSelectModule],
  templateUrl: './form.html',
  styleUrl: './form.scss'
})
export class FormComponent {
  protected readonly projectName = signal(environment.jiraProjectName);
  protected readonly apiToken = signal(environment.jiraApiToken);
  protected readonly email = signal(environment.jiraAccountEmail);
  protected readonly teams = signal(['Armadillo']);
  protected readonly sprints = signal('');
  protected readonly errorMessage = signal('');

  @Input() disableSubmit: boolean = false;

  @Output() formSubmit = new EventEmitter<FormData>();

  validateAndSubmit(): void {
    this.errorMessage.set('');

    const projectNameValue = this.projectName().trim() || environment.jiraProjectName || '';
    const apiTokenValue = this.apiToken() || environment.jiraApiToken || '';
    const emailValue = this.email().trim();
    const teamsValue = this.teams();
    const sprintsValue = this.sprints().trim();

    if (!apiTokenValue || !emailValue || !teamsValue.length || !sprintsValue) {
      this.errorMessage.set('Please fill in all fields');
      return;
    }

    const formData: FormData = {
      projectName: projectNameValue,
      apiToken: apiTokenValue,
      email: emailValue,
      teams: teamsValue,
      sprints: sprintsValue
    };

    this.formSubmit.emit(formData);
  }
}
