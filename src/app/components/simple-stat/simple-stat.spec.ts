import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SimpleStat } from './simple-stat';

describe('SimpleStat', () => {
  let component: SimpleStat;
  let fixture: ComponentFixture<SimpleStat>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SimpleStat]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SimpleStat);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
