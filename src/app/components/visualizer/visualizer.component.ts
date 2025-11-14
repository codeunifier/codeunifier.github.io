import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JiraParserService } from '../../services/jira-parser.service';
import { JiraApiService } from '../../services/jira-api.service';
import { VisualizerService } from '../../services/visualizer.service';
import { Colors } from '../../constants/colors';
import { FormComponent } from '../form/form';
import { BlockerStats, FormData, GraphData, JiraApiResponse, JiraTicket, Teams } from '../../models';
import { SimpleStat } from '../simple-stat/simple-stat';
import { Statuses } from '../../constants/statuses';
import { IndicatorType, SimpleIndicator } from './simple-indicator/simple-indicator';
import { TicketDetailPanel } from './ticket-detail-panel/ticket-detail-panel';

@Component({
  selector: 'app-visualizer',
  standalone: true,
  imports: [CommonModule, FormComponent, FormsModule, SimpleStat, SimpleIndicator, TicketDetailPanel],
  templateUrl: './visualizer.component.html',
  styleUrls: ['./visualizer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VisualizerComponent {
  @ViewChild('graphSvg', { static: false }) graphSvg?: ElementRef<SVGSVGElement>;

  protected readonly isLoading = signal(false);
  protected readonly stats = signal<BlockerStats>({ total: 0, blocking: 0, blocked: 0, independent: 0 });
  protected readonly hasData = signal(false);

  private graphData: GraphData | null = null;

  colors = Colors;

  ticketForDetailedView: JiraTicket | null = null;

  indicatorTypes = IndicatorType;
  statuses = Statuses;
  teams = Teams;

  submittedProjectName?: string;

  constructor(
    private jiraParser: JiraParserService,
    private jiraApi: JiraApiService,
    private visualizer: VisualizerService,
    private cdr: ChangeDetectorRef
  ) {}

  async fetchAndVisualize(formData: FormData): Promise<void> {
    try {
      this.submittedProjectName = formData.projectName;
      this.isLoading.set(true);

      // Use the proxy endpoint to avoid CORS issues
      const data: JiraApiResponse = await this.jiraApi.getTickets(formData);

      if (!data.issues || data.issues.length === 0) {
        // this.errorMessage.set('No tickets found for the specified team and sprint(s)');
        this.isLoading.set(false);
        return;
      }

      this.graphData = this.jiraParser.processTicketsFromJson(data.issues, formData);

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

        if (ticket) {
          // TODO: should be able to pass in the graph svg element and have the modal position itself relative to that
          this.showDetailedTicketView(ticket);
        }
      }, () => {
        this.ticketForDetailedView = null;
        this.cdr.markForCheck();
      }, this.graphSvg);
    }
  }

  private showDetailedTicketView(ticket: JiraTicket): void {
    this.ticketForDetailedView = ticket;
    this.cdr.markForCheck();
  }

  downloadSvg(): void {
    if (!this.graphSvg) {
      return;
    }

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(this.graphSvg.nativeElement);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'graph.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  downloadPng(): void {
    if (!this.graphSvg) {
      return;
    }

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(this.graphSvg.nativeElement);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      context?.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      canvas.toBlob((blob) => {
        if (blob) {
          const pngUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = pngUrl;
          link.download = 'graph.png';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(pngUrl);
        }
      }, 'image/png');
    };

    img.src = url;
  }
}
