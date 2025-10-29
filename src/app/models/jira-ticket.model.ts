import { IssueLink } from "./issue-link.model";

export interface JiraTicket {
  key: string;
  fields: {
    summary: string;
    status: {
      name: string;
    };
    issuelinks?: IssueLink[];
  };
}







export interface JiraApiResponse {
  issues: JiraTicket[];
}

export interface BlockerStats {
  total: number;
  blocking: number;
  blocked: number;
  independent: number;
}
