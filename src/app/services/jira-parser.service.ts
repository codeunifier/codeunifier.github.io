import { Injectable } from '@angular/core';
import { Colors } from '../constants/colors';
import { FormData, GraphData, GraphLink, GraphNode, IssueLink, JiraTicket, NodeShape, Teams } from '../models';
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

  processTicketsFromJson(issues: JiraTicket[], formData: FormData): GraphData {
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
        shape: this.getShapeForTeam(JiraApiService.getTeamName(issue.fields)),
      };
      nodes.push(node);
      allTickets.set(issue.key, node);
      return node;
    };

    const createNodeAndLink = (issue: JiraTicket, primaryNodeCreated: boolean, sourceIssue: JiraTicket) => {
      createAndAddNode(issue);

      if (!primaryNodeCreated) {
        createAndAddNode(sourceIssue);
        primaryNodeCreated = true;
      }
      
      links.push({
        source: sourceIssue.key,
        target: issue.key
      });
    }

    issues.forEach(issue => {
      let primaryNodeCreated = false;

      if (issue.fields.issuelinks) {
        issue.fields.issuelinks.forEach(link => {
          if (link.type.name === 'Blocks') {            
            if (this.shouldCreateAndAddNode(issue, link, 'outwardIssue', formData)) {
              createNodeAndLink(link.outwardIssue as JiraTicket, primaryNodeCreated, issue);
            }

            if (this.shouldCreateAndAddNode(issue, link, 'inwardIssue', formData)) {
              createNodeAndLink(link.inwardIssue as JiraTicket, primaryNodeCreated, issue);
            }
          }
        });
      }
    });

    return { nodes, links };
  }

  private shouldCreateAndAddNode(issue: JiraTicket, link: IssueLink, direction: 'inwardIssue' | 'outwardIssue', formData: FormData): boolean {
    const isUnfinished = this.isTicketUnfinished(issue.fields.status.name, issue.fields.issuetype.name, formData);

    if (isUnfinished && link[direction]) {
      const targetIssue = link[direction];
      const targetIssueTeamName = JiraApiService.getTeamName(targetIssue.fields)?.replace('Team ', '');
      const sprintNames = JiraApiService.getSprintNames(targetIssue.fields);

      return this.isTicketUnfinished(targetIssue.fields.status.name, targetIssue.fields.issuetype.name, formData) &&
        (formData.includeExternal ||
          (  
            targetIssue.fields.status.name.toLowerCase() !== 'done' &&
            !!targetIssueTeamName &&
            formData.teams.includes(targetIssueTeamName) &&
            this.atLeastOne(sprintNames, formData.sprints)
          )
        );
    }

    return false;
  }

  private isTicketUnfinished(status: string, issueType: string, formData: FormData): boolean {
    const statusLower = status.toLowerCase();
    return formData.includeDone || (statusLower !== 'done' && statusLower !== "won't fix" && issueType !== 'QAlity Test');
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

  private atLeastOne(needles: string[] | undefined, haystack: string): boolean {
    if (!needles || needles.length === 0) return false;
    return needles.some(needle => haystack.includes(needle));
  }
}
