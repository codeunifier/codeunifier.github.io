import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IndicatorType, SimpleIndicator } from './simple-indicator';

describe('SimpleIndicator', () => {
  let component: SimpleIndicator;
  let fixture: ComponentFixture<SimpleIndicator>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SimpleIndicator]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SimpleIndicator);
    const compRef = fixture.componentRef;
    compRef.setInput('type', IndicatorType.Status);
    compRef.setInput('label', 'Done');
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
