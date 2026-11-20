import { GraphData, GraphLink, GraphNode } from '../models';
import { GraphLayoutService } from './graph-layout.service';

function node(id: string): GraphNode {
  return { id, label: id, summary: '', status: 'To Do', color: '#000' };
}

function link(blocker: string, blocked: string): GraphLink {
  return { source: blocker, target: blocked };
}

function graph(nodeIds: string[], links: GraphLink[]): GraphData {
  return { nodes: nodeIds.map(node), links };
}

describe('GraphLayoutService', () => {
  let service: GraphLayoutService;

  beforeEach(() => {
    service = new GraphLayoutService();
  });

  it('assigns a position to every node', () => {
    const data = graph(['A', 'B', 'C'], [link('A', 'B')]);

    service.layout(data);

    data.nodes.forEach(n => {
      expect(n.x).toEqual(jasmine.any(Number));
      expect(n.y).toEqual(jasmine.any(Number));
    });
  });

  it('places blockers underneath the ticket they block', () => {
    // A blocks B, B blocks C, D blocks C
    const data = graph(['A', 'B', 'C', 'D'], [link('A', 'B'), link('B', 'C'), link('D', 'C')]);

    service.layout(data);

    const byId = new Map(data.nodes.map(n => [n.id, n]));
    data.links.forEach(l => {
      const blocker = byId.get(l.source as string)!;
      const blocked = byId.get(l.target as string)!;
      expect(blocker.y).toBeGreaterThan(blocked.y!, `${blocker.id} should sit below ${blocked.id}`);
    });
  });

  it('keeps nodes from overlapping', () => {
    // one blocked ticket with many blockers in the same row
    const blockers = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'];
    const data = graph(['P', ...blockers], blockers.map(b => link(b, 'P')));

    service.layout(data, { nodeWidth: 80, nodeHeight: 80 });

    for (let i = 0; i < data.nodes.length; i++) {
      for (let j = i + 1; j < data.nodes.length; j++) {
        const a = data.nodes[i];
        const b = data.nodes[j];
        const distance = Math.hypot(a.x! - b.x!, a.y! - b.y!);
        expect(distance).toBeGreaterThanOrEqual(80, `${a.id} overlaps ${b.id}`);
      }
    }
  });

  it('keeps separate chains from overlapping', () => {
    const data = graph(['A', 'B', 'C', 'D', 'E'], [link('A', 'B'), link('C', 'D')]);

    service.layout(data, { nodeWidth: 80, nodeHeight: 80 });

    const box = (ids: string[]) => {
      const nodes = data.nodes.filter(n => ids.includes(n.id));
      return {
        left: Math.min(...nodes.map(n => n.x! - 40)),
        right: Math.max(...nodes.map(n => n.x! + 40)),
        top: Math.min(...nodes.map(n => n.y! - 40)),
        bottom: Math.max(...nodes.map(n => n.y! + 40)),
      };
    };
    const boxes = [box(['A', 'B']), box(['C', 'D']), box(['E'])];

    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        const apart = a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top;
        expect(apart).toBeTrue();
      }
    }
  });

  it('wraps many small chains into several rows to match the aspect ratio', () => {
    const ids: string[] = [];
    const links: GraphLink[] = [];
    for (let i = 0; i < 12; i++) {
      ids.push(`A${i}`, `B${i}`);
      links.push(link(`A${i}`, `B${i}`));
    }
    const data = graph(ids, links);

    const size = service.layout(data, { aspectRatio: 1 });

    const topRows = new Set(data.nodes.filter(n => n.id.startsWith('B')).map(n => Math.round(n.y!)));
    expect(topRows.size).toBeGreaterThan(1);
    expect(size.width / size.height).toBeLessThan(3);
  });

  it('attaches a route of at least two points to every link', () => {
    const data = graph(['A', 'B', 'C'], [link('A', 'B'), link('B', 'C'), link('A', 'C')]);

    service.layout(data);

    data.links.forEach(l => {
      expect(l.points!.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('does not throw on cycles', () => {
    const data = graph(['A', 'B'], [link('A', 'B'), link('B', 'A')]);

    expect(() => service.layout(data)).not.toThrow();
    data.nodes.forEach(n => expect(n.x).toEqual(jasmine.any(Number)));
  });

  it('accepts links whose endpoints are node objects', () => {
    const data = graph(['A', 'B'], []);
    data.links.push({ source: data.nodes[0], target: data.nodes[1] });

    service.layout(data);

    expect(data.nodes[0].y).toBeGreaterThan(data.nodes[1].y!);
  });

  it('reports the size of the laid out graph', () => {
    const data = graph(['A', 'B'], [link('A', 'B')]);

    const size = service.layout(data);

    expect(size.width).toBeGreaterThan(0);
    expect(size.height).toBeGreaterThan(0);
  });
});
