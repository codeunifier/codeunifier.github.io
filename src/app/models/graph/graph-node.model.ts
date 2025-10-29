import { NodeShape } from "./node-shape.enum";

export interface GraphNode {
  id: string;
  label: string;
  summary: string;
  status: string;
  color: string;
  shape?: NodeShape;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}
