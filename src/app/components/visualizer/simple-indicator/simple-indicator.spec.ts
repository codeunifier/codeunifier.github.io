import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SimpleIndicator } from './simple-indicator';

describe('SimpleIndicator', () => {
  let component: SimpleIndicator;
  let fixture: ComponentFixture<SimpleIndicator>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SimpleIndicator]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SimpleIndicator);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
