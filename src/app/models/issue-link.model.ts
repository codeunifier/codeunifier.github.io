export interface IssueLink {
  type: {
    name: string;
    inward?: string;
    outward?: string;
  };
  outwardIssue?: {
    key: string;
    fields: {
      status: {
        name: string;
      };
      issuetype: {
        id: string;
        name: string;
      };
    };
  };
  inwardIssue?: {
    key: string;
    fields: {
      status: {
        name: string;
      };
      issuetype: {
        id: string;
        name: string;
      };
    };
  };
}