import { ElementRef, Injectable } from "@angular/core";
import * as d3 from 'd3';
import { GraphData } from "../models";

@Injectable({
  providedIn: 'root'
})
export class StructuredVisualizerService {
  // Visual configuration
  chargeStrength = -2000;
  collisionRadius = 70;
  linkDistance = 100;
  nodeSize = 35;
  rowHeight = 160; // The vertical distance between "generations" of tickets

  visualizeGraph(data: GraphData, onNodeClick: (id: string) => void, onGraphClick: () => void, graphSvg?: ElementRef<SVGSVGElement>): void {
    if (!graphSvg || !graphSvg.nativeElement) {
      console.error('Graph SVG element not found');
      return;
    }

    const container = graphSvg.nativeElement.parentElement!;
    const width = container.clientWidth || 1200;
    const height = 800;

    const svg = d3.select(graphSvg.nativeElement);
    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);

    // Background for deselecting
    svg.insert('rect', ':first-child')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('fill', '#f8f9fa')
      .on('click', (event: any) => {
        event.stopPropagation();
        onGraphClick();
      });

    const g = svg.append('g');

    // 1. Calculate the Rank (Level) for each node
    this.assignLevels(data.nodes, data.links);

    // 2. Define the Simulation with Hierarchical Forces
    const simulation = d3.forceSimulation(data.nodes)
      // Pull nodes to their specific row based on their rank
      .force('y', d3.forceY((d: any) => (d.level * this.rowHeight) + 100).strength(1))
      // Keep nodes distributed horizontally
      .force('x', d3.forceX(width / 2).strength(0.1))
      .force('link', d3.forceLink(data.links).id((d: any) => d.id).distance(this.linkDistance))
      .force('charge', d3.forceManyBody().strength(this.chargeStrength))
      .force('collision', d3.forceCollide().radius(this.collisionRadius));

    // Arrowhead definition
    svg.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 32)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .append('svg:path')
      .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
      .attr('fill', '#999');

    // Links
    const link = g.append('g')
      .selectAll('line')
      .data(data.links)
      .enter().append('line')
      .attr('stroke', '#999')
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#arrowhead)');

    // Nodes
    const node = g.append('g')
      .selectAll('g')
      .data(data.nodes)
      .enter().append('g')
      .call(d3.drag<any, any>()
        .on('start', (event, d) => this.dragstarted(event, d, simulation))
        .on('drag', (event, d) => this.dragged(event, d))
        .on('end', (event, d) => this.dragended(event, d, simulation)));

    node.each((d: any, i, elements) => {
      const gElement = d3.select(elements[i]);
      const shape = d.shape || 'circle';

      switch (shape) {
        case 'hexagon': this.appendHexagon(gElement, d, onNodeClick); break;
        case 'triangle': this.appendTriangle(gElement, d, onNodeClick); break;
        case 'circle': this.appendCircle(gElement, d, onNodeClick); break;
        default: this.appendSquare(gElement, d, onNodeClick); break;
      }
    });

    // Node Labels
    node.append('text')
      .text((d: any) => d.label)
      .attr('text-anchor', 'middle')
      .attr('dy', 4) // Centered for circles/squares
      .attr('fill', '#fff')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .style('pointer-events', 'none');

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => g.attr('transform', event.transform.toString()));

    svg.call(zoom);

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });
  }

  /**
   * Identifies the 'generation' of each node.
   * Roots (no incoming blockers) are Level 0.
   */
  private assignLevels(nodes: any[], links: any[]): void {
    nodes.forEach(n => n.level = 0);

    // Iteratively push blocked tickets down one level lower than their blocker
    let changed = true;
    let iterations = 0;
    const maxIterations = nodes.length; // Prevent infinite loops in circular dependencies

    while (changed && iterations < maxIterations) {
      changed = false;
      links.forEach(link => {
        const source = nodes.find(n => n.id === (link.source.id || link.source));
        const target = nodes.find(n => n.id === (link.target.id || link.target));
        
        if (source && target && target.level <= source.level) {
          target.level = source.level + 1;
          changed = true;
        }
      });
      iterations++;
    }
  }

  // --- Shape Rendering Helpers ---

  private appendCircle(gElement: any, d: any, onClick: any): void {
    gElement.append('circle')
      .attr('r', this.nodeSize)
      .attr('fill', d.color).attr('stroke', '#fff').attr('stroke-width', 3)
      .style('cursor', 'pointer')
      .on('click', (event: any) => { event.stopPropagation(); onClick(d.id); });
  }

  private appendTriangle(gElement: any, d: any, onClick: any): void {
    const size = this.nodeSize * 1.2;
    const h = size * Math.sqrt(3) / 2;
    const points = `0,${-h/2} ${-size},${h/2} ${size},${h/2}`;
    
    gElement.append('polygon')
      .attr('points', points)
      .attr('fill', d.color).attr('stroke', '#fff').attr('stroke-width', 3)
      .style('cursor', 'pointer')
      .on('click', (event: any) => { event.stopPropagation(); onClick(d.id); });
    
    // Adjust text position for triangles specifically
    gElement.select('text').attr('dy', 10);
  }

  private appendHexagon(gElement: any, d: any, onClick: any): void {
    const size = this.nodeSize;
    const points = Array.from({ length: 6 }, (_, i) => {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      return `${size * Math.cos(angle)},${size * Math.sin(angle)}`;
    }).join(' ');
    
    gElement.append('polygon')
      .attr('points', points)
      .attr('fill', d.color).attr('stroke', '#fff').attr('stroke-width', 3)
      .style('cursor', 'pointer')
      .on('click', (event: any) => { event.stopPropagation(); onClick(d.id); });
  }

  private appendSquare(gElement: any, d: any, onClick: any): void {
    const size = this.nodeSize * 1.8;
    gElement.append('rect')
      .attr('x', -size/2).attr('y', -size/2).attr('width', size).attr('height', size)
      .attr('fill', d.color).attr('stroke', '#fff').attr('stroke-width', 3)
      .style('cursor', 'pointer')
      .on('click', (event: any) => { event.stopPropagation(); onClick(d.id); });
  }

  // --- Drag Handlers ---

  private dragstarted(event: any, d: any, simulation: any): void {
    if (!event.active) simulation.alphaTarget(0.03).restart();
    d.fx = d.x; d.fy = d.y;
  }

  private dragged(event: any, d: any): void {
    d.fx = event.x; d.fy = event.y;
  }

  private dragended(event: any, d: any, simulation: any): void {
    if (!event.active) simulation.alphaTarget(0);
    // Note: We keep d.fx and d.fy null so they can "settle" back into their rows
    d.fx = null; d.fy = null;
  }
}