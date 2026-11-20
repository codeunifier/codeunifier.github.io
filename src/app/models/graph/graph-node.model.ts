import { JiraTicket } from "../jira-ticket.model";
import { NodeShape } from "./node-shape.enum";

export interface GraphNode {
  id: string;
  label: string;
  summary: string;
  status: string;
  color: string;
  shape?: NodeShape;
  /** Center position assigned by the layout. */
  x?: number;
  y?: number;
  ticket?: JiraTicket;
}
