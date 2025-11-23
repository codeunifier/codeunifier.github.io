import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TicketDetailPanel } from './ticket-detail-panel';
import { JiraTicket } from '../../../models';
import { JiraApiService } from '../../../services/jira-api.service';
import { IndicatorType, SimpleIndicator } from '../simple-indicator/simple-indicator';

describe('TicketDetailPanel', () => {
  let component: TicketDetailPanel;
  let fixture: ComponentFixture<TicketDetailPanel>;

  const mockTicket: JiraTicket = {
    id: '10001',
    key: 'TEST-123',
    fields: {
      issuetype: {
        id: 'abc123',
        name: 'Bug'
      },
      summary: 'Sample Jira Ticket',
      status: {
        name: 'Open'
      },
      [ JiraApiService.TEAM_CUSTOM_FIELD ]: {
        id: 'team1',
        name: 'Team A'
      },
      self: 'https://example.atlassian.net/rest/api/2/issue/10001'
    }
  } as JiraTicket;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TicketDetailPanel, SimpleIndicator]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TicketDetailPanel);
    const compRef = fixture.componentRef;
    compRef.setInput('ticket', mockTicket);
    compRef.setInput('projectName', 'packback');
    component = fixture.componentInstance;
    component.indicatorTypes = IndicatorType;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
