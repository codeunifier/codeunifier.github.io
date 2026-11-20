import { Injectable } from '@angular/core';
import dagre, { type EdgeLabel, type GraphLabel, type NodeLabel } from '@dagrejs/dagre';
import { GraphData, GraphLink, GraphNode, Point } from '../models';

export interface LayoutOptions {
  /** Space reserved for each node, including its stroke and some breathing room. */
  nodeWidth: number;
  nodeHeight: number;
  /** Horizontal gap between nodes in the same row. */
  nodeSeparation: number;
  /** Vertical gap between rows. */
  rankSeparation: number;
  /** Gap between separate chains. */
  chainSeparation: number;
  /** Padding around the whole drawing. */
  margin: number;
  /** Width-to-height ratio the drawing should roughly fill, usually that of the viewport. */
  aspectRatio: number;
}

export interface LayoutSize {
  width: number;
  height: number;
}

interface PlacedChain {
  nodes: GraphNode[];
  links: GraphLink[];
  width: number;
  height: number;
}

const DEFAULT_OPTIONS: LayoutOptions = {
  nodeWidth: 90,
  nodeHeight: 90,
  nodeSeparation: 40,
  rankSeparation: 90,
  chainSeparation: 80,
  margin: 40,
  aspectRatio: 16 / 9,
};

/**
 * Arranges a blocker graph in layers: a blocked ticket sits above the tickets that block it.
 * Each connected chain is laid out on its own, then the chains are packed into rows so the
 * whole drawing roughly matches the requested aspect ratio. Positions are written onto the
 * nodes (`x`, `y`) and link routes onto the links (`points`).
 */
@Injectable({
  providedIn: 'root'
})
export class GraphLayoutService {
  layout(data: GraphData, options: Partial<LayoutOptions> = {}): LayoutSize {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    const chains = this.connectedChains(data).map(chain => this.layoutChain(chain.nodes, chain.links, opts));

    return this.packChains(chains, opts);
  }

  /** Lay out one connected chain with its top-left corner at the origin. */
  private layoutChain(nodes: GraphNode[], links: GraphLink[], opts: LayoutOptions): PlacedChain {
    const graph = new dagre.graphlib.Graph<GraphLabel, NodeLabel, EdgeLabel>();
    graph.setGraph({
      // Bottom-to-top: link sources (blockers) end up underneath their targets (blocked tickets)
      rankdir: 'BT',
      nodesep: opts.nodeSeparation,
      ranksep: opts.rankSeparation,
      marginx: 0,
      marginy: 0,
      ranker: 'network-simplex',
    });
    graph.setDefaultEdgeLabel(() => ({}));

    nodes.forEach(node => {
      graph.setNode(node.id, { width: opts.nodeWidth, height: opts.nodeHeight });
    });

    links.forEach(link => {
      graph.setEdge(this.endpointId(link.source), this.endpointId(link.target));
    });

    dagre.layout(graph);

    nodes.forEach(node => {
      const placed = graph.node(node.id);
      node.x = placed.x;
      node.y = placed.y;
    });

    links.forEach(link => {
      const route = graph.edge(this.endpointId(link.source), this.endpointId(link.target));
      link.points = route?.points?.map(p => ({ x: p.x, y: p.y }));
    });

    const label = graph.graph();
    return { nodes, links, width: label.width ?? opts.nodeWidth, height: label.height ?? opts.nodeHeight };
  }

  /**
   * Place chains left to right in rows, starting a new row once a row is about as wide as the
   * drawing should be. Taller chains go first so each row's tops line up neatly.
   */
  private packChains(chains: PlacedChain[], opts: LayoutOptions): LayoutSize {
    const sorted = [...chains].sort((a, b) => b.height - a.height || b.width - a.width);

    const totalArea = sorted.reduce((sum, c) => sum + (c.width + opts.chainSeparation) * (c.height + opts.chainSeparation), 0);
    const widest = Math.max(0, ...sorted.map(c => c.width));
    const targetWidth = Math.max(widest, Math.sqrt(totalArea * opts.aspectRatio));

    let x = 0;
    let y = 0;
    let rowHeight = 0;
    let drawingWidth = 0;

    sorted.forEach(chain => {
      if (x > 0 && x + chain.width > targetWidth) {
        x = 0;
        y += rowHeight + opts.chainSeparation;
        rowHeight = 0;
      }

      this.translateChain(chain, x + opts.margin, y + opts.margin);

      x += chain.width + opts.chainSeparation;
      rowHeight = Math.max(rowHeight, chain.height);
      drawingWidth = Math.max(drawingWidth, x - opts.chainSeparation);
    });

    return {
      width: drawingWidth + opts.margin * 2,
      height: y + rowHeight + opts.margin * 2,
    };
  }

  private translateChain(chain: PlacedChain, dx: number, dy: number): void {
    chain.nodes.forEach(node => {
      node.x = (node.x ?? 0) + dx;
      node.y = (node.y ?? 0) + dy;
    });
    chain.links.forEach(link => {
      link.points = link.points?.map((p: Point) => ({ x: p.x + dx, y: p.y + dy }));
    });
  }

  /** Split the graph into groups of nodes that are connected to each other by links. */
  private connectedChains(data: GraphData): Array<{ nodes: GraphNode[]; links: GraphLink[] }> {
    const nodesById = new Map(data.nodes.map(node => [node.id, node]));
    const neighbours = new Map<string, Set<string>>(data.nodes.map(node => [node.id, new Set<string>()]));

    data.links.forEach(link => {
      const source = this.endpointId(link.source);
      const target = this.endpointId(link.target);
      neighbours.get(source)?.add(target);
      neighbours.get(target)?.add(source);
    });

    const chainOf = new Map<string, number>();
    const chains: Array<{ nodes: GraphNode[]; links: GraphLink[] }> = [];

    data.nodes.forEach(start => {
      if (chainOf.has(start.id)) return;

      const index = chains.length;
      const chain = { nodes: [] as GraphNode[], links: [] as GraphLink[] };
      const pending = [start.id];
      chainOf.set(start.id, index);

      while (pending.length) {
        const id = pending.pop()!;
        chain.nodes.push(nodesById.get(id)!);
        neighbours.get(id)?.forEach(next => {
          if (!chainOf.has(next)) {
            chainOf.set(next, index);
            pending.push(next);
          }
        });
      }

      chains.push(chain);
    });

    data.links.forEach(link => {
      const index = chainOf.get(this.endpointId(link.source));
      if (index !== undefined) chains[index].links.push(link);
    });

    return chains;
  }

  private endpointId(endpoint: string | GraphNode): string {
    return typeof endpoint === 'string' ? endpoint : endpoint.id;
  }
}
