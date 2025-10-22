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
    };
  };
  inwardIssue?: {
    key: string;
    fields: {
      status: {
        name: string;
      };
    };
  };
}

export interface GraphNode {
  id: string;
  label: string;
  summary: string;
  status: string;
  color: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
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
