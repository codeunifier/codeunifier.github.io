export const environment = {
  production: false,
  // Prefills the form during local development. Put real values in the gitignored
  // environment.local.ts (used by `npm start`) rather than here.
  jiraProjectName: '',
  jiraApiToken: '',
  jiraAccountEmail: '',
  // When set, the API service loads this JSON file instead of calling Jira
  fixtureUrl: '',
};
