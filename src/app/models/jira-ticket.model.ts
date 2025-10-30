import { JiraApiService } from "../services/jira-api.service";
import { IssueLink } from "./issue-link.model";

export interface JiraTicket {
  key: string;
  fields: {
    issuetype: {
      id: string;
      name: string;
    };
    summary: string;
    status: {
      name: string;
    };
    [JiraApiService.TEAM_CUSTOM_FIELD]: {
      id: string;
      name: string;
    };
    issuelinks?: IssueLink[];
  };
}
