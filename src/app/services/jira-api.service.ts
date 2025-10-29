import { Injectable } from "@angular/core";
import { JIRA_TEAMS } from "../constants/jira-teams";
import { JiraApiResponse } from "../models/jira-ticket.model";
import { FormData } from "../models/form-data.model";

@Injectable({
  providedIn: 'root'
})
export class JiraApiService {
  async getTickets(formData: FormData): Promise<JiraApiResponse> {
    const teamGuids = formData.teams.map((team) => JIRA_TEAMS.get(team)).join(',');

    const sprintNumbers = formData.sprints.split(',').map(s => s.trim());
    const sprintQueries = sprintNumbers.map(num => `sprint = ${num}`).join(' OR ');

    const auth = btoa(`${formData.email}:${formData.apiToken}`);

    const jql = `Team[Team] IN (${teamGuids}) AND (${sprintQueries}) AND resolved IS EMPTY ORDER BY key`;
    const url = `/api/proxy/${formData.projectName}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&fields=key,summary,status,issuelinks&maxResults=1000`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch tickets: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}
