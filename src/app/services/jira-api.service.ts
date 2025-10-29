import { Injectable } from "@angular/core";
import { JIRA_TEAMS } from "../constants/jira-teams";
import { FormData } from "../models/form-data.model";
import { JiraApiResponse, JiraTicket } from "../models";

@Injectable({
  providedIn: 'root'
})
export class JiraApiService {
  static TEAM_CUSTOM_FIELD = 'customfield_10001';

  async getTickets(formData: FormData): Promise<JiraApiResponse> {
    const auth = btoa(`${formData.email}:${formData.apiToken}`);

    // First, fetch the tickets that match the team and sprint criteria
    const tickets = await this.fetchFilteredTickets(auth, formData);

    // Then, fetch the tickets that are blocking the previously fetched tickets as there may be dependencies outside of the team / board parameters
    const blockingTickets = formData.includeExternal ? await this.fetchBlockingTickets(auth, formData, tickets.issues) : { issues: [] };
    
    // Combine both sets of tickets
    const allTickets: JiraTicket[] = [...tickets.issues, ...blockingTickets.issues];
    
    return { issues: allTickets };
  }

  private async fetchFilteredTickets(auth: string, formData: FormData): Promise<JiraApiResponse> {
    const teamGuids = formData.teams.map((team) => JIRA_TEAMS.get(team)).join(',');

    const sprintNumbers = formData.sprints.split(',').map(s => s.trim());
    const sprintQueries = sprintNumbers.map(num => `sprint = ${num}`).join(' OR ');

    const jql = `"Team[Team]" IN (${teamGuids}) AND (${sprintQueries}) ${formData.includeDone ? '' : 'AND resolved IS EMPTY'} ORDER BY key`;
    const url = `/api/proxy/${formData.projectName}/rest/api/latest/search/jql?jql=${encodeURIComponent(jql)}&fields=key,summary,status,issuelinks,${JiraApiService.TEAM_CUSTOM_FIELD}&maxResults=1000`;

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

  private fetchBlockingTickets(auth: string, formData: FormData, tickets: Array<JiraTicket>): Promise<JiraApiResponse> {
    const blockingKeys = new Set<string>();
    const existingKeys = new Set(tickets.map(ticket => ticket.key));

    tickets.forEach(ticket => {
      ticket.fields.issuelinks?.forEach(link => {
        if (link.type.inward === 'is blocked by' && link.inwardIssue) {
          if (!existingKeys.has(link.inwardIssue.key)) {
            blockingKeys.add(link.inwardIssue.key);
          }
        }
      });
    });

    if (blockingKeys.size === 0) {
      return Promise.resolve({ issues: [] });
    }

    const jql = `key IN (${Array.from(blockingKeys).join(',')}) ${formData.includeDone ? '' : 'AND resolved IS EMPTY'} ORDER BY key`;
    const url = `/api/proxy/${formData.projectName}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&fields=key,summary,status,issuelinks&maxResults=1000`;

    return fetch(url, {
      method: 'GET',
      headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to fetch blocking tickets: ${response.status} ${response.statusText}`);
      }
      return response.json();
    });
  }
}
