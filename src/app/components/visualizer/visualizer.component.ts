import { Component, ElementRef, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JiraParserService } from '../../services/jira-parser.service';
import { JiraApiService } from '../../services/jira-api.service';
import { VisualizerService } from '../../services/visualizer.service';
import { Colors } from '../../constants/colors';
import { FormComponent } from '../form/form';
import { BlockerStats, FormData, GraphData, JiraApiResponse, JiraTicket } from '../../models';
import { NodeOverviewDialog } from './node-overview-dialog/node-overview-dialog';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-visualizer',
  standalone: true,
  imports: [CommonModule, FormComponent, FormsModule],
  templateUrl: './visualizer.component.html',
  styleUrl: './visualizer.component.scss'
})
export class VisualizerComponent {
  @ViewChild('graphSvg', { static: false }) graphSvg?: ElementRef<SVGSVGElement>;

  protected readonly isLoading = signal(false);
  protected readonly stats = signal<BlockerStats>({ total: 0, blocking: 0, blocked: 0, independent: 0 });
  protected readonly hasData = signal(false);

  private graphData: GraphData | null = null;

  colors = Colors;

  constructor(
    private jiraParser: JiraParserService,
    private jiraApi: JiraApiService,
    private visualizer: VisualizerService,
    private dialog: MatDialog
  ) {}

  async fetchAndVisualize(formData: FormData): Promise<void> {
    try {
      this.isLoading.set(true);

      // Use the proxy endpoint to avoid CORS issues
      const data: JiraApiResponse = await this.jiraApi.getTickets(formData);

      if (!data.issues || data.issues.length === 0) {
        // this.errorMessage.set('No tickets found for the specified team and sprint(s)');
        this.isLoading.set(false);
        return;
      }

      this.graphData = this.jiraParser.processTicketsFromJson(data.issues, formData.includeDone);

      this.updateStats(this.graphData!);
      this.hasData.set(true);

      // Use setTimeout to ensure the DOM has updated before visualizing
      setTimeout(() => {
        this.visualize();
        this.isLoading.set(false);
      }, 100);
    } catch (error) {
      console.error('Error:', error);
      // this.errorMessage.set(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        const ticket = this.graphData!.nodes.find(node => node.id === id)?.ticket;

        // TODO: should be able to pass in the graph svg element and have the modal position itself relative to that
        const dialogRef = this.dialog.open(NodeOverviewDialog, {
          data: ticket,
          hasBackdrop: false,
        });

        dialogRef.afterClosed().subscribe(result => {
          console.log('The dialog was closed');
        });
      }, this.graphSvg);
    }
  }
}
