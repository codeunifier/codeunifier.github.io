import { ElementRef, Injectable } from "@angular/core";

import * as d3 from 'd3';
import { GraphData } from "../models";

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

  visualizeGraph(data: GraphData, onNodeClick: (id: string) => void, onGraphClick: () => void, graphSvg?: ElementRef<SVGSVGElement>): void {
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

    svg.insert('rect', ':first-child')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('fill', 'white')
      .on('click', (event: any, d: any) => {
        event.stopPropagation();
        onGraphClick();
      });;

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

    node.each((d: any, i, elements) => {
      const gElement = d3.select(elements[i]);
      const shape = d.shape || 'circle';

      switch (shape) {
        case 'hexagon':
          this.appendHexagon(gElement, d, onNodeClick);
          break;
        case 'triangle':
          this.appendTriangle(gElement, d, onNodeClick);
          break;
        case 'circle':
          this.appendCircle(gElement, d, onNodeClick);
          break;
        case 'square':
        default:
          this.appendSquare(gElement, d, onNodeClick);
          break;
      }
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

  private appendCircle(gElement: d3.Selection<SVGGElement, unknown, null, undefined>, d: any, onClick: (id: string) => void): void {
    gElement.append('circle')
      .attr('r', this.nodeSize)
      .attr('fill', (d: any) => d.color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 3)
      .style('cursor', 'pointer')
      .on('click', (event: any, d: any) => {
        event.stopPropagation();
        onClick(d.id);
      });
  }

  // the triangle works but the text is cut off in the middle
  private appendTriangle(gElement: d3.Selection<SVGGElement, unknown, null, undefined>, d: any, onClick: (id: string) => void): void {
    const size = this.nodeSize;
    
    // Approximate the height of an equilateral triangle
    // The y coordinates are inverted in SVG (y=0 is the top).
    const h = size * Math.sqrt(3) / 2;
    
    const points = [
      { x: 0, y: -h }, // Top point
      { x: -size, y: h }, // Bottom-left point
      { x: size, y: h }  // Bottom-right point
    ].map(p => `${p.x},${p.y}`).join(' '); // Format for the 'points' attribute
    
    gElement.append('polygon')
      .attr('points', points)
      .attr('fill', d.color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 3)
      .style('cursor', 'pointer')
      .on('click', (event: any, d: any) => {
        event.stopPropagation();
        onClick(d.id);
      });
  }

  private appendHexagon(gElement: d3.Selection<SVGGElement, unknown, null, undefined>, d: any, onClick: (id: string) => void): void {
    const size = this.nodeSize;
    const points = Array.from({ length: 6 }, (_, i) => {
      const angle = (Math.PI / 3) * i - Math.PI / 2; // Start from the top
      return `${size * Math.cos(angle)},${size * Math.sin(angle)}`;
    }).join(' ');
    
    gElement.append('polygon')
      .attr('points', points)
      .attr('fill', d.color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 3)
      .style('cursor', 'pointer')
      .on('click', (event: any, d: any) => {
        event.stopPropagation();
        onClick(d.id);
      });
  }

  private appendSquare(gElement: d3.Selection<SVGGElement, unknown, null, undefined>, d: any, onClick: (id: string) => void): void {
    const size = this.nodeSize * 2;
    const halfSize = size / 2;

    gElement.append('rect')
      .attr('x', -halfSize)
      .attr('y', -halfSize)
      .attr('width', size)
      .attr('height', size)
      .attr('fill', d.color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 3)
      .style('cursor', 'pointer')
      .on('click', (event: any, d: any) => {
        event.stopPropagation();
        onClick(d.id);
      });
  }

  private dragstarted(event: any, d: any, simulation: any): void {
    if (!event.active) simulation.alphaTarget(0.03).restart();
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
