import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TicketDetailPanel } from './ticket-detail-panel';

describe('TicketDetailPanel', () => {
  let component: TicketDetailPanel;
  let fixture: ComponentFixture<TicketDetailPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TicketDetailPanel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TicketDetailPanel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
