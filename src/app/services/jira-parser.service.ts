import { Injectable } from '@angular/core';
import { Colors } from '../constants/colors';
import { GraphData, GraphLink, GraphNode, JiraTicket, NodeShape, Teams } from '../models';
import { JiraApiService } from './jira-api.service';

@Injectable({
  providedIn: 'root'
})
export class JiraParserService {
  getStatusColor(status: string): string {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('done')) {
      return Colors.Green;
    } else if (statusLower.includes('progress') || statusLower.includes('review')) {
      return Colors.Peach;
    } else if (statusLower.includes('to do') || statusLower.includes('open') || statusLower.includes('backlog')) {
      return Colors.Blue;
    }
    return Colors.Gray;
  }

  processTicketsFromJson(issues: JiraTicket[]): GraphData {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const ticketMap = new Map<string, GraphNode>();

    issues.forEach(issue => {
      let node: GraphNode;

      if (issue.fields.issuelinks) {
        issue.fields.issuelinks.forEach(link => {
          if (link.type.name === 'Blocks') {
            let hasUnfinishedBlocker = false;
            
            if (link.outwardIssue && link.outwardIssue.fields.status.name.toLowerCase() !== 'done') {
              hasUnfinishedBlocker = true;
              const targetKey = link.outwardIssue.key;
              if (ticketMap.has(targetKey)) {
                links.push({
                  source: issue.key,
                  target: targetKey
                });
              }
            }
            if (link.inwardIssue && link.inwardIssue.fields.status.name.toLowerCase() !== 'done') {
              hasUnfinishedBlocker = true;
              const sourceKey = link.inwardIssue.key;
              if (ticketMap.has(sourceKey)) {
                links.push({
                  source: sourceKey,
                  target: issue.key
                });
              }
            }

            if (hasUnfinishedBlocker && !node) {
              node = {
                id: issue.key,
                label: issue.key,
                summary: issue.fields.summary,
                status: issue.fields.status.name,
                color: this.getStatusColor(issue.fields.status.name),
                shape: this.getShapeForTeam((issue.fields[JiraApiService.TEAM_CUSTOM_FIELD] as { name: string })?.name)
              };
              nodes.push(node);
              ticketMap.set(issue.key, node);
            }
          }
        });
      }
    });

    return { nodes, links };
  }

  private getShapeForTeam(teamName?: string): NodeShape {
    switch (teamName) {
      case Teams.Backpack:
        return NodeShape.Hexagon;
      case Teams.Armadillo:
        return NodeShape.Circle;
      default:
        return NodeShape.Square;
    }
  }
}
