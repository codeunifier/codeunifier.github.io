import { Injectable } from "@angular/core";
import { JIRA_TEAMS } from "../constants/jira-teams";
import { FormData } from "../models/form-data.model";
import { JiraApiResponse, JiraTicket } from "../models";

@Injectable({
  providedIn: 'root'
})
export class JiraApiService {
  static TEAM_CUSTOM_FIELD = 'customfield_10001';
  static SPRINT_CUSTOM_FIELD = 'customfield_10008';

  protected readonly FIELDS = 'key,issuetype,summary,status,issuelinks,sprint,' + JiraApiService.TEAM_CUSTOM_FIELD + ',' + JiraApiService.SPRINT_CUSTOM_FIELD;
  protected readonly JIRA_API = '/rest/api/latest/search/jql';

  static getTeamName(fields: any): string | undefined {
    const teamField = fields[JiraApiService.TEAM_CUSTOM_FIELD];
    return teamField ? teamField.name : undefined;
  }

  static getSprintNames(fields: any): string[] {
    const sprintField = fields[JiraApiService.SPRINT_CUSTOM_FIELD];
    if (!sprintField || !Array.isArray(sprintField)) {
      return [];
    }

    return sprintField.map((sprint: any) => {
      return sprint.name;
    }).filter((name: string) => name !== '');
  }

  async getTickets(formData: FormData): Promise<JiraApiResponse> {
    const auth = btoa(`${formData.email}:${formData.apiToken}`);

    // First, fetch the tickets that match the team and sprint criteria
    const tickets = await this.fetchFilteredTickets(auth, formData);

    // Then, fetch the tickets that are blocking the previously fetched tickets as there may be dependencies outside of the team / board parameters
    const blockingTickets = await this.fetchBlockingTickets(auth, formData, tickets.issues);

    // Then, fetch the tickets that are being blocked by the previously fetched tickets as there may be dependencies outside of the team / board parameters
    const blockedTickets = await this.fetchBlockedTickets(auth, formData, tickets.issues);
    
    // Combine both sets of tickets
    const combinedTickets: JiraTicket[] = this.combineTickets(tickets.issues, blockingTickets.issues, blockedTickets.issues);
    
    return { issues: combinedTickets };
  }

  private combineTickets(tickets: JiraTicket[], blockingTickets: JiraTicket[], blockedTickets: JiraTicket[]): JiraTicket[] {
    // loop through the "tickets" array and overwrite the linked tickets with those from the blockingTickets and blockedTickets arrays
    tickets.forEach(ticket => {
      if (ticket.fields.issuelinks && ticket.fields.issuelinks.length > 0) {
        for (let i = 0; i < ticket.fields.issuelinks?.length; i++) {
          const link = ticket.fields.issuelinks[i];

          if (link.type.inward === 'is blocked by' && link.type.outward === 'blocks') {
            if (link.inwardIssue) {
              const inwardIssue = tickets.find(t => t.key === link.inwardIssue?.key) ?? blockingTickets.find(t => t.key === link.inwardIssue?.key);

              if (inwardIssue) {
                ticket.fields.issuelinks[i].inwardIssue = inwardIssue;
              }
            }

            if (link.outwardIssue) {
              const outwardIssue = tickets.find(t => t.key === link.outwardIssue?.key) ?? blockedTickets.find(t => t.key === link.outwardIssue?.key);

              if (outwardIssue) {
                ticket.fields.issuelinks[i].outwardIssue = outwardIssue;
              }
            }
          }
        }
      }
    });

    return tickets;
  }

  private async fetchFilteredTickets(auth: string, formData: FormData): Promise<JiraApiResponse> {
    const teamGuids = formData.teams.map((team) => JIRA_TEAMS.get(team)).join(',');

    const sprintNumbers = formData.sprints.split(',').map(s => s.trim());
    const sprintQueries = sprintNumbers.map(num => `sprint = ${num}`).join(' OR ');

    const jql = `"Team[Team]" IN (${teamGuids}) AND type != "QAlity Test" AND (${sprintQueries}) ${formData.includeDone ? '' : 'AND status NOT IN (DONE, "Won\'t Fix")'} ORDER BY key`;
    const url = this.buildUrl(formData.projectName, jql);

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

    const jql = `key IN (${Array.from(blockingKeys).join(',')}) AND type != "QAlity Test" ${formData.includeDone ? '' : 'AND status NOT IN (DONE, "Won\'t Fix")'} ORDER BY key`;
    const url = this.buildUrl(formData.projectName, jql);

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

  private fetchBlockedTickets(auth: string, formData: FormData, tickets: Array<JiraTicket>): Promise<JiraApiResponse> {
    const blockedKeys = new Set<string>();
    const existingKeys = new Set(tickets.map(ticket => ticket.key));

    tickets.forEach(ticket => {
      ticket.fields.issuelinks?.forEach(link => {
        if (link.type.outward === 'blocks' && link.outwardIssue) {
          if (!existingKeys.has(link.outwardIssue.key)) {
            blockedKeys.add(link.outwardIssue.key);
          }
        }
      });
    });

    if (blockedKeys.size === 0) {
      return Promise.resolve({ issues: [] });
    }

    const jql = `key IN (${Array.from(blockedKeys).join(',')}) AND type != "QAlity Test" ${formData.includeDone ? '' : 'AND status NOT IN (DONE, "Won\'t Fix")'} ORDER BY key`;
    const url = this.buildUrl(formData.projectName, jql);

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
        throw new Error(`Failed to fetch blocked tickets: ${response.status} ${response.statusText}`);
      }
      return response.json();
    });
  }

  private buildUrl(projectName: string, jql: string): string {
    return `/api/proxy/${projectName}${this.JIRA_API}?jql=${encodeURIComponent(jql)}&fields=${this.FIELDS}&maxResults=1000`;
  }
}
