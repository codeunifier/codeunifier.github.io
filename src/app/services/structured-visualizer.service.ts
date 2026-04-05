import { ElementRef, Injectable } from "@angular/core";
import * as d3 from 'd3';
import { GraphData } from "../models";

@Injectable({
  providedIn: 'root'
})
export class StructuredVisualizerService {
  chargeStrength = -2000;
  collisionRadius = 80; // Increased for better "box" spacing
  linkDistance = 100;
  nodeSize = 35;
  rowHeight = 180; // Increased vertical room

  visualizeGraph(data: GraphData, onNodeClick: (id: string) => void, onGraphClick: () => void, graphSvg?: ElementRef<SVGSVGElement>): void {
    if (!graphSvg || !graphSvg.nativeElement) return;

    const container = graphSvg.nativeElement.parentElement!;
    const width = container.clientWidth || 1200;
    const height = 1000;

    const svg = d3.select(graphSvg.nativeElement);
    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);

    const g = svg.append('g');

    // 1. Logic Prep: Level Assignment & Component Grouping
    this.assignLevels(data.nodes, data.links);
    this.initializeGroupedPositions(data.nodes, data.links, width);

    // 2. Simulation (Static start with alpha 0)
    const simulation = d3.forceSimulation(data.nodes)
      .alpha(0)
      .force('link', d3.forceLink(data.links).id((d: any) => d.id).distance(this.linkDistance))
      .force('charge', d3.forceManyBody().strength(this.chargeStrength))
      .force('collision', d3.forceCollide().radius(this.collisionRadius));

    // Arrowheads, Links, and Nodes (Same as before, simplified for brevity)
    this.setupDefinitions(svg);
    const link = this.renderLinks(g, data.links);
    const node = this.renderNodes(g, data.nodes, simulation, onNodeClick);

    // Initial render call
    this.updatePositions(link, node);

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => g.attr('transform', event.transform.toString()));
    svg.call(zoom);

    simulation.on('tick', () => this.updatePositions(link, node));
  }

  /**
   * Divide the graph into "Boxes" and position nodes within them.
   */
  private initializeGroupedPositions(nodes: any[], links: any[], canvasWidth: number): void {
    const components = this.getConnectedComponents(nodes, links);
    let currentXOffset = 50; // Starting gutter
    const groupGutter = 100; // Space between "boxes"

    components.forEach(compNodes => {
      // 1. Determine max width needed for this specific chain
      const maxLevel = Math.max(...compNodes.map(n => n.level));
      const levelWidths = new Array(maxLevel + 1).fill(0);
      compNodes.forEach(n => levelWidths[n.level]++);
      
      const maxNodesInARow = Math.max(...levelWidths);
      const compWidth = maxNodesInARow * (this.collisionRadius * 2.2);
      const compCenterX = currentXOffset + (compWidth / 2);

      // 2. Position Level 0 (Roots) centered in the box
      const roots = compNodes.filter(n => n.level === 0).sort((a, b) => a.id.localeCompare(b.id));
      const rootSpacing = compWidth / (roots.length + 1);
      roots.forEach((n, i) => {
        n.x = currentXOffset + (rootSpacing * (i + 1));
        n.y = 100;
        n.fx = n.x; n.fy = n.y;
      });

      // 3. Position Children relative to their specific parents' average X
      for (let l = 1; l <= maxLevel; l++) {
        const levelNodes = compNodes.filter(n => n.level === l);
        levelNodes.forEach(node => {
          const parents = links
            .filter(link => (link.target.id || link.target) === node.id)
            .map(link => nodes.find(n => n.id === (link.source.id || link.source)))
            .filter(n => !!n);

          if (parents.length > 0) {
            node.x = parents.reduce((sum, p) => sum + p!.x, 0) / parents.length;
          } else {
            node.x = compCenterX; // Fallback
          }
          node.y = (l * this.rowHeight) + 100;
          node.fx = node.x; node.fy = node.y;
        });

        // Ensure nodes in the same row don't overlap within the box
        this.resolveRowOverlaps(levelNodes);
      }

      currentXOffset += compWidth + groupGutter;
    });
  }

  private resolveRowOverlaps(nodes: any[]): void {
    nodes.sort((a, b) => a.x - b.x);
    const minSpacing = this.collisionRadius * 2;
    for (let i = 1; i < nodes.length; i++) {
      if (nodes[i].x - nodes[i - 1].x < minSpacing) {
        nodes[i].x = nodes[i - 1].x + minSpacing;
        nodes[i].fx = nodes[i].x;
      }
    }
  }

  private getConnectedComponents(nodes: any[], links: any[]): any[][] {
    const adj = new Map<string, string[]>();
    nodes.forEach(n => adj.set(n.id, []));
    links.forEach(l => {
      const s = l.source.id || l.source;
      const t = l.target.id || l.target;
      adj.get(s)?.push(t);
      adj.get(t)?.push(s);
    });

    const visited = new Set<string>();
    const components: any[][] = [];
    nodes.forEach(node => {
      if (!visited.has(node.id)) {
        const comp: any[] = [];
        const stack = [node.id];
        visited.add(node.id);
        while (stack.length) {
          const id = stack.pop()!;
          comp.push(nodes.find(n => n.id === id));
          adj.get(id)?.forEach(neighbor => {
            if (!visited.has(neighbor)) {
              visited.add(neighbor);
              stack.push(neighbor);
            }
          });
        }
        components.push(comp);
      }
    });
    return components;
  }

  // --- Support Methods ---

  private assignLevels(nodes: any[], links: any[]): void {
    nodes.forEach(n => n.level = 0);
    let changed = true;
    while (changed) {
      changed = false;
      links.forEach(link => {
        const s = nodes.find(n => n.id === (link.source.id || link.source));
        const t = nodes.find(n => n.id === (link.target.id || link.target));
        if (s && t && t.level <= s.level) {
          t.level = s.level + 1;
          changed = true;
        }
      });
    }
  }

  private updatePositions(link: any, node: any): void {
    link.attr('x1', (d: any) => d.source.x).attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x).attr('y2', (d: any) => d.target.y);
    node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
  }

  private setupDefinitions(svg: any): void {
    svg.append('defs').append('marker').attr('id', 'arrowhead').attr('viewBox', '-0 -5 10 10').attr('refX', 32).attr('refY', 0).attr('orient', 'auto').attr('markerWidth', 8).attr('markerHeight', 8).append('path').attr('d', 'M 0,-5 L 10 ,0 L 0,5').attr('fill', '#999');
  }

  private renderLinks(g: any, links: any[]): any {
    return g.append('g').selectAll('line').data(links).enter().append('line').attr('stroke', '#999').attr('stroke-width', 2).attr('marker-end', 'url(#arrowhead)');
  }

  private renderNodes(g: any, nodes: any[], simulation: any, onClick: any): any {
    const node = g.append('g').selectAll('g').data(nodes).enter().append('g')
      .call(d3.drag<any, any>()
        .on('start', (event, d) => { if (!event.active) simulation.alphaTarget(0.1).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
        .on('end', (event, d) => { if (!event.active) simulation.alphaTarget(0); d.fx = event.x; d.fy = event.y; }));

    node.each((d: any, i: number, elements: any) => {
      const gEl = d3.select(elements[i]);
      const shape = d.shape || 'circle';
      if (shape === 'triangle') this.appendTriangle(gEl, d, onClick);
      else if (shape === 'hexagon') this.appendHexagon(gEl, d, onClick);
      else if (shape === 'circle') this.appendCircle(gEl, d, onClick);
      else this.appendSquare(gEl, d, onClick);
    });

    node.append('text').text((d: any) => d.label).attr('text-anchor', 'middle').attr('dy', 4).attr('fill', '#fff').attr('font-size', '10px').attr('font-weight', 'bold').style('pointer-events', 'none');
    return node;
  }

  // --- Shape Helpers (Previously Provided) ---
  private appendCircle(g: any, d: any, onClick: any) { g.append('circle').attr('r', this.nodeSize).attr('fill', d.color).attr('stroke', '#fff').attr('stroke-width', 3).on('click', (e: any) => { e.stopPropagation(); onClick(d.id); }); }
  private appendTriangle(g: any, d: any, onClick: any) { 
    const h = (this.nodeSize * 1.2) * Math.sqrt(3) / 2;
    g.append('polygon').attr('points', `0,${-h/2} ${-this.nodeSize*1.2},${h/2} ${this.nodeSize*1.2},${h/2}`).attr('fill', d.color).attr('stroke', '#fff').attr('stroke-width', 3).on('click', (e: any) => { e.stopPropagation(); onClick(d.id); }); 
    g.select('text').attr('dy', 10);
  }
  private appendHexagon(g: any, d: any, onClick: any) { 
    const points = Array.from({length: 6}, (_, i) => { const a = (Math.PI/3)*i - Math.PI/2; return `${this.nodeSize * Math.cos(a)},${this.nodeSize * Math.sin(a)}`; }).join(' ');
    g.append('polygon').attr('points', points).attr('fill', d.color).attr('stroke', '#fff').attr('stroke-width', 3).on('click', (e: any) => { e.stopPropagation(); onClick(d.id); }); 
  }
  private appendSquare(g: any, d: any, onClick: any) { const s = this.nodeSize * 1.8; g.append('rect').attr('x', -s/2).attr('y', -s/2).attr('width', s).attr('height', s).attr('fill', d.color).attr('stroke', '#fff').attr('stroke-width', 3).on('click', (e: any) => { e.stopPropagation(); onClick(d.id); }); }
}
