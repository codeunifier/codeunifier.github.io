import { Injectable } from "@angular/core";
import { JIRA_TEAMS } from "../constants/jira-teams";
import { JiraApiResponse } from "../models/ticket.model";

@Injectable({
  providedIn: 'root'
})
export class JiraApiService {
  async getTickets(emailValue: string, apiTokenValue: string, teamName: string, sprints: string): Promise<JiraApiResponse> {
    const teamGuid = JIRA_TEAMS.get(teamName);

    const sprintNumbers = sprints.split(',').map(s => s.trim());
    const sprintQueries = sprintNumbers.map(num => `sprint = ${num}`).join(' OR ');

    const auth = btoa(`${emailValue}:${apiTokenValue}`);

    const jql = `Team[Team] = "${teamGuid}" AND (${sprintQueries}) AND resolved IS EMPTY ORDER BY key`;
    const url = `/api/jira/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&fields=key,summary,status,issuelinks&maxResults=1000`;
    
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
