import { JiraTicket } from "./jira-ticket.model";

export interface JiraApiResponse {
  issues: JiraTicket[];
}
