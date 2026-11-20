import { ElementRef, Injectable, inject } from "@angular/core";

import * as d3 from 'd3';
import { GraphData, GraphLink, GraphNode, NodeShape, Point } from "../models";
import { GraphLayoutService } from "./graph-layout.service";

type NodeSelection = d3.Selection<SVGGElement, GraphNode, SVGGElement, unknown>;
type LinkSelection = d3.Selection<SVGPathElement, GraphLink, SVGGElement, unknown>;

/**
 * Draws the blocker graph as a static layered diagram: blocked tickets on top, their blockers
 * underneath. Nodes can be dragged freely (nothing pushes back), the canvas can be panned and
 * zoomed, and the drawing is fitted to the viewport on first render.
 */
@Injectable({
  providedIn: 'root'
})
export class VisualizerService {
  private readonly layoutService = inject(GraphLayoutService);

  // The radius of each node
  nodeSize = 35;
  // Horizontal gap between nodes in the same row
  nodeSeparation = 40;
  // Vertical gap between a ticket and the row of tickets blocking it
  rankSeparation = 90;
  // Padding kept around the drawing when fitting it to the viewport
  fitPadding = 30;
  // Never shrink the drawing below this scale when fitting; the user can pan to see the rest
  minFitScale = 0.5;

  private readonly arrowLength = 10;
  private readonly curve = d3.line<Point>().x(p => p.x).y(p => p.y).curve(d3.curveBasis);

  visualizeGraph(data: GraphData, onNodeClick: (id: string) => void, onGraphClick: () => void, graphSvg?: ElementRef<SVGSVGElement>): void {
    if (!graphSvg || !graphSvg.nativeElement) {
      console.error('Graph SVG element not found');
      return;
    }

    const svgElement = graphSvg.nativeElement;
    const container = svgElement.parentElement!;
    const width = container.clientWidth || 1200;
    const height = container.clientHeight || 600;

    const svg = d3.select(svgElement);
    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);

    svg.append('rect')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('fill', 'white')
      .on('click', (event: MouseEvent) => {
        event.stopPropagation();
        onGraphClick();
      });

    this.appendArrowhead(svg);

    const nodeExtent = this.nodeSize * 2 + 20;
    const layoutSize = this.layoutService.layout(data, {
      nodeWidth: nodeExtent,
      nodeHeight: nodeExtent,
      nodeSeparation: this.nodeSeparation,
      rankSeparation: this.rankSeparation,
      aspectRatio: width / height,
    });

    const nodesById = new Map(data.nodes.map(node => [node.id, node]));
    const g = svg.append('g');

    const link: LinkSelection = g.append('g')
      .attr('class', 'links')
      .selectAll<SVGPathElement, GraphLink>('path')
      .data(data.links)
      .enter().append('path')
      .attr('fill', 'none')
      .attr('stroke', '#999')
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#arrowhead)');

    const node: NodeSelection = g.append('g')
      .attr('class', 'nodes')
      .selectAll<SVGGElement, GraphNode>('g')
      .data(data.nodes)
      .enter().append('g')
      .style('cursor', 'grab');

    node.each((d, i, elements) => this.appendShape(d3.select(elements[i]), d, onNodeClick));

    node.append('text')
      .text(d => d.label)
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.shape === NodeShape.Triangle ? 10 : 4)
      .attr('fill', '#fff')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .style('pointer-events', 'none');

    node.append('title')
      .text(d => `${d.label}: ${d.summary}\nStatus: ${d.status}`);

    const redrawLinks = (links: LinkSelection) =>
      links.attr('d', d => this.linkPath(d, nodesById));

    const positionNodes = <P extends d3.BaseType, PD>(nodes: d3.Selection<SVGGElement, GraphNode, P, PD>) =>
      nodes.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`);

    redrawLinks(link);
    positionNodes(node);

    const touchedLinks = (id: string) =>
      link.filter(l => this.endpointId(l.source) === id || this.endpointId(l.target) === id);

    node.call(d3.drag<SVGGElement, GraphNode>()
      .on('start', function () {
        d3.select(this).style('cursor', 'grabbing');
      })
      .on('drag', function (event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>, d) {
        d.x = event.x;
        d.y = event.y;
        // Bring the node to the front only once it actually moves: re-ordering the DOM on
        // mousedown would cancel the browser's click event, which opens the detail panel.
        positionNodes(d3.select<SVGGElement, GraphNode>(this).raise());
        // Once a node has been moved by hand, its links become straight lines
        const touched = touchedLinks(d.id);
        touched.each(l => l.points = undefined);
        redrawLinks(touched);
      })
      .on('end', function () {
        d3.select(this).style('cursor', 'grab');
      }));

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString());
      });

    svg.call(zoom);
    svg.call(zoom.transform, this.fitTransform(layoutSize, width, height));
  }

  /** Zoom and pan so the whole drawing is visible, without enlarging small graphs. */
  private fitTransform(layoutSize: { width: number; height: number }, width: number, height: number): d3.ZoomTransform {
    const availableWidth = Math.max(width - this.fitPadding * 2, 1);
    const availableHeight = Math.max(height - this.fitPadding * 2, 1);

    const fitScale = Math.min(availableWidth / layoutSize.width, availableHeight / layoutSize.height, 1);
    const scale = Math.max(fitScale, this.minFitScale);

    const scaledWidth = layoutSize.width * scale;
    const scaledHeight = layoutSize.height * scale;

    const x = scaledWidth <= width ? (width - scaledWidth) / 2 : this.fitPadding;
    const y = scaledHeight <= height ? (height - scaledHeight) / 2 : this.fitPadding;

    return d3.zoomIdentity.translate(x, y).scale(scale);
  }

  /** Path for a link, following the layout's route when there is one and stopping at the node edges. */
  private linkPath(link: GraphLink, nodesById: Map<string, GraphNode>): string {
    const source = this.resolve(link.source, nodesById);
    const target = this.resolve(link.target, nodesById);
    if (!source || !target) return '';

    const start = { x: source.x ?? 0, y: source.y ?? 0 };
    const end = { x: target.x ?? 0, y: target.y ?? 0 };

    const route = link.points && link.points.length > 2 ? link.points.slice(1, -1) : [];
    const points = [start, ...route, end];

    points[0] = this.shorten(points[0], points[1], this.nodeSize);
    const last = points.length - 1;
    points[last] = this.shorten(points[last], points[last - 1], this.nodeSize + 2);

    return this.curve(points) ?? '';
  }

  /** Move `from` toward `toward` by `distance`, so a link starts and ends at a node's edge. */
  private shorten(from: Point, toward: Point, distance: number): Point {
    const dx = toward.x - from.x;
    const dy = toward.y - from.y;
    const length = Math.hypot(dx, dy);
    if (length === 0 || length <= distance) return from;
    return { x: from.x + (dx / length) * distance, y: from.y + (dy / length) * distance };
  }

  private resolve(endpoint: string | GraphNode, nodesById: Map<string, GraphNode>): GraphNode | undefined {
    return typeof endpoint === 'string' ? nodesById.get(endpoint) : endpoint;
  }

  private endpointId(endpoint: string | GraphNode): string {
    return typeof endpoint === 'string' ? endpoint : endpoint.id;
  }

  private appendArrowhead(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>): void {
    svg.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', this.arrowLength)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .append('svg:path')
      .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
      .attr('fill', '#999')
      .style('stroke', 'none');
  }

  private appendShape(gElement: d3.Selection<SVGGElement, unknown, null, undefined>, d: GraphNode, onClick: (id: string) => void): void {
    switch (d.shape ?? NodeShape.Circle) {
      case NodeShape.Hexagon:
        this.appendHexagon(gElement, d, onClick);
        break;
      case NodeShape.Triangle:
        this.appendTriangle(gElement, d, onClick);
        break;
      case NodeShape.Circle:
        this.appendCircle(gElement, d, onClick);
        break;
      case NodeShape.Square:
      default:
        this.appendSquare(gElement, d, onClick);
        break;
    }
  }

  private appendCircle(gElement: d3.Selection<SVGGElement, unknown, null, undefined>, d: GraphNode, onClick: (id: string) => void): void {
    this.decorate(gElement.append('circle').attr('r', this.nodeSize), d, onClick);
  }

  private appendTriangle(gElement: d3.Selection<SVGGElement, unknown, null, undefined>, d: GraphNode, onClick: (id: string) => void): void {
    const size = this.nodeSize * 1.2;
    const h = size * Math.sqrt(3) / 2;
    const points = [
      { x: 0, y: -h },
      { x: -size, y: h },
      { x: size, y: h }
    ].map(p => `${p.x},${p.y}`).join(' ');

    this.decorate(gElement.append('polygon').attr('points', points), d, onClick);
  }

  private appendHexagon(gElement: d3.Selection<SVGGElement, unknown, null, undefined>, d: GraphNode, onClick: (id: string) => void): void {
    const size = this.nodeSize;
    const points = Array.from({ length: 6 }, (_, i) => {
      const angle = (Math.PI / 3) * i - Math.PI / 2; // Start from the top
      return `${size * Math.cos(angle)},${size * Math.sin(angle)}`;
    }).join(' ');

    this.decorate(gElement.append('polygon').attr('points', points), d, onClick);
  }

  private appendSquare(gElement: d3.Selection<SVGGElement, unknown, null, undefined>, d: GraphNode, onClick: (id: string) => void): void {
    const size = this.nodeSize * 2;
    const halfSize = size / 2;

    this.decorate(
      gElement.append('rect').attr('x', -halfSize).attr('y', -halfSize).attr('width', size).attr('height', size),
      d,
      onClick
    );
  }

  private decorate<E extends SVGElement>(shape: d3.Selection<E, unknown, null, undefined>, d: GraphNode, onClick: (id: string) => void): void {
    shape
      .attr('fill', d.color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 3)
      .style('cursor', 'pointer')
      .on('click', (event: MouseEvent) => {
        event.stopPropagation();
        onClick(d.id);
      });
  }
}
