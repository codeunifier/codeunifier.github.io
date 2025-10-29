import { GraphNode } from "./graph-node.model";

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
}
