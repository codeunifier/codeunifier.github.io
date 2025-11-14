import { Injectable } from '@angular/core';
import { Colors } from '../constants/colors';
import { FormData, GraphData, GraphLink, GraphNode, IssueLink, JiraTicket, NodeShape, Teams } from '../models';
import { JiraApiService } from './jira-api.service';

@Injectable({
  providedIn: 'root'
})
export class JiraParserService {
  static getStatusColor(status: string): string {
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
    // 1. Storage for links and a Set to track only tickets that are part of a chain
    const finalLinks: GraphLink[] = [];
    
    // Map to quickly look up the full JiraTicket object by its key
    const issueMap = new Map<string, JiraTicket>();
    issues.forEach(issue => issueMap.set(issue.key, issue));

    // 2. Iterate through all issues to build the links array and the Set of chained keys
    const chainedTicketKeys = this.buildTicketChains(issues, formData, finalLinks);

    // 3. Create the final nodes only for tickets that are part of blocker chains
    const finalNodes: GraphNode[] = Array.from(chainedTicketKeys)
      .map(key => {
        const issue = issueMap.get(key);
        if (!issue) {
          // This case should ideally not happen if data is well-formed
          console.warn(`Issue key ${key} found in chain but not in initial issue list.`);
          return null;
        }

        return {
          id: issue.key,
          label: issue.key,
          summary: issue.fields.summary,
          status: issue.fields.status.name,
          color: JiraParserService.getStatusColor(issue.fields.status.name),
          shape: this.getShapeForTeam(JiraApiService.getTeamName(issue.fields)),
          ticket: issue,
          // D3 properties will be added by the force simulation later
        } as GraphNode;
      })
      .filter((node): node is GraphNode => node !== null); // Filter out any nulls

    return { nodes: finalNodes, links: finalLinks };
  }

  private buildTicketChains(issues: Array<JiraTicket>, formData: FormData, finalLinks: Array<GraphLink>): Set<string> {
    const chainedTicketKeys = new Set<string>();
    
    // NEW: Create a set of all available keys for fast lookup
    const allFetchedKeys = new Set(issues.map(i => i.key)); // <-- This is the key change

    issues.forEach(issue => {
      if (issue.fields.issuelinks) {
        issue.fields.issuelinks.forEach(link => {
          if (link.type.name === 'Blocks') {
            // --- OUTWARD LINK: issue BLOCKS outwardIssue (issue -> outwardIssue) ---
            if (link.outwardIssue && this.shouldCreateLink(issue, link, 'outwardIssue', formData)) {
              const targetTicket = link.outwardIssue as JiraTicket;
              
              // Only create the link if the target was actually fetched.
              if (allFetchedKeys.has(targetTicket.key)) {
                  // Add link and mark both source and target as chained
                  finalLinks.push({ source: issue.key, target: targetTicket.key });
                  chainedTicketKeys.add(issue.key);
                  chainedTicketKeys.add(targetTicket.key);
              }
            }

            // --- INWARD LINK: inwardIssue BLOCKS issue (inwardIssue -> issue) ---
            if (link.inwardIssue && this.shouldCreateLink(issue, link, 'inwardIssue', formData)) {
              const sourceTicket = link.inwardIssue as JiraTicket;

              // Only create the link if the source was actually fetched.
              if (allFetchedKeys.has(sourceTicket.key)) {
                  // Add link and mark both source and target as chained
                  finalLinks.push({ source: sourceTicket.key, target: issue.key });
                  chainedTicketKeys.add(sourceTicket.key);
                  chainedTicketKeys.add(issue.key);
              }
            }
          }
        });
      }
    });

    return chainedTicketKeys;
  }

  private shouldCreateLink(issue: JiraTicket, link: IssueLink, direction: 'inwardIssue' | 'outwardIssue', formData: FormData): boolean {
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
    switch (teamName?.replace('Team ', '')) {
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
