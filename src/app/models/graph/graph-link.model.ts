import { GraphNode } from "./graph-node.model";

export interface Point {
  x: number;
  y: number;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  /** Route assigned by the layout; when absent the link is drawn as a straight line. */
  points?: Point[];
}
