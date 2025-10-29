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
