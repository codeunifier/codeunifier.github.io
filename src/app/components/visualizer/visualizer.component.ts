import { Component, ElementRef, ViewChild, AfterViewInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JiraParserService } from '../../services/jira-parser.service';
import { GraphData, BlockerStats, JiraApiResponse } from '../../models/ticket.model';
import { environment } from '../../../environments/environment';
import { JiraApiService } from '../../services/jira-api.service';
import { VisualizerService } from '../../services/visualizer.service';
import { Colors } from '../../constants/colors';

@Component({
  selector: 'app-visualizer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './visualizer.component.html',
  styleUrl: './visualizer.component.scss'
})
export class VisualizerComponent {
  @ViewChild('graphSvg', { static: false }) graphSvg?: ElementRef<SVGSVGElement>;

  protected readonly apiToken = signal(environment.jiraApiToken);
  protected readonly email = signal(environment.jiraAccountEmail);
  protected readonly team = signal('Armadillo');
  protected readonly sprints = signal('');
  protected readonly errorMessage = signal('');
  protected readonly isLoading = signal(false);
  protected readonly stats = signal<BlockerStats>({ total: 0, blocking: 0, blocked: 0, independent: 0 });
  protected readonly hasData = signal(false);

  private graphData: GraphData | null = null;

  colors = Colors;

  constructor(private jiraParser: JiraParserService, private jiraApi: JiraApiService, private visualizer: VisualizerService) {}

  async fetchAndVisualize(): Promise<void> {
    this.errorMessage.set('');

    const apiTokenValue = this.apiToken() || environment.jiraApiToken || '';
    const emailValue = this.email().trim();
    const teamValue = this.team();
    const sprintsValue = this.sprints().trim();

    if (!apiTokenValue || !emailValue || !teamValue || !sprintsValue) {
      this.errorMessage.set('Please fill in all fields');
      return;
    }

    try {
      this.isLoading.set(true);

      // Use the proxy endpoint to avoid CORS issues
      const data: JiraApiResponse = await this.jiraApi.getTickets(emailValue, apiTokenValue, teamValue, sprintsValue);

      if (!data.issues || data.issues.length === 0) {
        this.errorMessage.set('No tickets found for the specified team and sprint(s)');
        this.isLoading.set(false);
        return;
      }

      this.graphData = this.jiraParser.processTicketsFromJson(data.issues);

      this.updateStats(this.graphData);
      this.hasData.set(true);

      // Use setTimeout to ensure the DOM has updated before visualizing
      setTimeout(() => {
        this.visualize();
        this.isLoading.set(false);
      }, 100);
    } catch (error) {
      console.error('Error:', error);
      this.errorMessage.set(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.isLoading.set(false);
    }
  }

  private updateStats(data: GraphData): void {
    const blockingTickets = new Set(data.links.map(l => typeof l.source === 'string' ? l.source : l.source.id));
    const blockedTickets = new Set(data.links.map(l => typeof l.target === 'string' ? l.target : l.target.id));
    const allInvolved = new Set([...blockingTickets, ...blockedTickets]);

    this.stats.set({
      total: data.nodes.length,
      blocking: blockingTickets.size,
      blocked: blockedTickets.size,
      independent: data.nodes.length - allInvolved.size
    });
  }

  private visualize(): void {
    if (this.graphData) {
      this.visualizer.visualizeGraph(this.graphData, (id: string) => {
        const jiraUrl = `https://${environment.jiraInstance}/browse/${id}`;
        window.open(jiraUrl, '_blank');
      }, this.graphSvg);
    }
  }
}
