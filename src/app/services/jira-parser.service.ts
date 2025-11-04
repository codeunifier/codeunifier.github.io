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

  processTicketsFromJson(issues: JiraTicket[], includeDone: boolean): GraphData {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const allTickets = new Map<string, GraphNode>();

    const createAndAddNode = (issue: JiraTicket) => {
      if (allTickets.has(issue.key)) {
        return allTickets.get(issue.key)!;
      }

      const node: GraphNode = {
        id: issue.key,
        label: issue.key,
        summary: issue.fields.summary,
        status: issue.fields.status.name,
        color: this.getStatusColor(issue.fields.status.name),
        shape: this.getShapeForTeam((issue.fields[JiraApiService.TEAM_CUSTOM_FIELD] as { name: string })?.name)
      };
      nodes.push(node);
      allTickets.set(issue.key, node);
      return node;
    };

    issues.forEach(issue => {
      let primaryNodeCreated = false;

      if (issue.fields.issuelinks) {
        issue.fields.issuelinks.forEach(link => {
          if (link.type.name === 'Blocks') {
            const isUnfinished = (issue: JiraTicket) => 
              (includeDone || (issue.fields.status.name.toLowerCase() !== 'done' && 
              issue.fields.status.name.toLowerCase() !== "won't fix")) &&
              issue.fields.issuetype.name !== 'QAlity Test';
            
            if (link.outwardIssue && isUnfinished(link.outwardIssue as unknown as JiraTicket)) {
              const targetIssue = link.outwardIssue;
              const targetKey = targetIssue.key;

              createAndAddNode(targetIssue as unknown as JiraTicket);

              if (!primaryNodeCreated) {
                createAndAddNode(issue);
                primaryNodeCreated = true;
              }
              
              links.push({
                source: issue.key,
                target: targetKey
              });
            }

            if (link.inwardIssue && isUnfinished(link.inwardIssue as unknown as JiraTicket)) {
              const sourceIssue = link.inwardIssue;
              const sourceKey = sourceIssue.key;

              createAndAddNode(sourceIssue as unknown as JiraTicket);

              if (!primaryNodeCreated) {
                createAndAddNode(issue);
                primaryNodeCreated = true;
              }
              
              links.push({
                source: sourceKey,
                target: issue.key
              });
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
      case Teams.AI:
        return NodeShape.Square;
      default:
        return NodeShape.Triangle;
    }
  }
}
