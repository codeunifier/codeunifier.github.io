import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { JiraTicket } from '../../../models';
import { IndicatorType, SimpleIndicator } from '../simple-indicator/simple-indicator';

@Component({
  selector: 'app-ticket-detail-panel',
  imports: [SimpleIndicator],
  standalone: true,
  templateUrl: './ticket-detail-panel.html',
  styleUrl: './ticket-detail-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TicketDetailPanel {
  ticket = input.required<JiraTicket>();
  projectName = input.required<string>();

  indicatorTypes = IndicatorType;

  openInJira(): void {
    const jiraUrl = `https://${this.projectName()}.atlassian.net/browse/${this.ticket().key}`;
    window.open(jiraUrl, '_blank');
  }
}
