import { ElementRef, Injectable } from "@angular/core";
import { GraphData } from "../models/ticket.model";

import * as d3 from 'd3';

@Injectable({
  providedIn: 'root'
})
export class VisualizerService {
  // The repulsive force between all nodes
  chargeStrength = -200;
  // Prevents nodes from colliding - a smaller value means more clustering
  collisionRadius = 60;
  // The distance between linked nodes - the length of the arrows
  linkDistance = 250;
  // The size of each node
  nodeSize = 35;

  visualizeGraph(data: GraphData, onClick: (id: string) => void, graphSvg?: ElementRef<SVGSVGElement>): void {
    if (!graphSvg || !graphSvg.nativeElement) {
      console.error('Graph SVG element not found');
      return;
    }

    const container = graphSvg.nativeElement.parentElement!;
    const width = container.clientWidth || 1200;
    const height = 600;

    const svg = d3.select(graphSvg.nativeElement);
    svg.selectAll('*').remove();

    svg.attr('width', width).attr('height', height);

    const g = svg.append('g');

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
      .attr('fill', '#999')
      .style('stroke', 'none');

    const simulation = d3.forceSimulation(data.nodes)
      .force('link', d3.forceLink(data.links).id((d: any) => d.id).distance(this.linkDistance))
      .force('charge', d3.forceManyBody().strength(this.chargeStrength))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(this.collisionRadius));

    const link = g.append('g')
      .selectAll('line')
      .data(data.links)
      .enter().append('line')
      .attr('stroke', '#999')
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#arrowhead)');

    const node = g.append('g')
      .selectAll('g')
      .data(data.nodes)
      .enter().append('g')
      .call(d3.drag<any, any>()
        .on('start', (event, d) => this.dragstarted(event, d, simulation))
        .on('drag', (event, d) => this.dragged(event, d))
        .on('end', (event, d) => this.dragended(event, d, simulation)));

    node.append('circle')
      .attr('r', this.nodeSize)
      .attr('fill', (d: any) => d.color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 3)
      .style('cursor', 'pointer')
      .on('click', (event: any, d: any) => {
        event.stopPropagation();
        onClick(d.id);
      });

    node.append('text')
      .text((d: any) => d.label)
      .attr('text-anchor', 'middle')
      .attr('dy', 4)
      .attr('fill', '#fff')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .style('pointer-events', 'none');

    node.append('title')
      .text((d: any) => `${d.label}: ${d.summary}\nStatus: ${d.status}`);

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString());
      });

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

  private dragstarted(event: any, d: any, simulation: any): void {
    if (!event.active) simulation.alphaTarget(0.01).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  private dragged(event: any, d: any): void {
    d.fx = event.x;
    d.fy = event.y;
  }

  private dragended(event: any, d: any, simulation: any): void {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }
}
