import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DragHandle } from './drag-handle';

describe('DragHandle', () => {
  let component: DragHandle;
  let fixture: ComponentFixture<DragHandle>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DragHandle]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DragHandle);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
