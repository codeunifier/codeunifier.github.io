
import { ChangeDetectionStrategy, Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

import { faGrip } from '@fortawesome/free-solid-svg-icons/faGrip';

@Component({
  selector: 'app-drag-handle',
  imports: [FontAwesomeModule],
  standalone: true,
  templateUrl: './drag-handle.html',
  styleUrls: ['./drag-handle.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DragHandle {
  @Input() height: number = 600;
  @Output() resize = new EventEmitter<number>();

  faGrip = faGrip;
  
  // State variables for resizing
  isResizing: boolean = false;
  initialY: number = 0;
  initialHeight: number = 0;

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.isResizing) {
      return;
    }

    const currentY = event.clientY;
    
    // Calculate the difference in Y position (how far the user dragged)
    const deltaY = currentY - this.initialY; 
    
    // New height is the initial height plus the vertical drag distance
    let newHeight = this.initialHeight + deltaY;
    
    // Ensure the height doesn't go below a minimum value
    const minHeight = 50;
    newHeight = Math.max(newHeight, minHeight);
    this.resize.emit(newHeight);
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    this.isResizing = false;
  }

  startResize(event: MouseEvent | TouchEvent): void {
    event.preventDefault();

    this.isResizing = true;// Determine the Y-coordinate (client screen position)
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    
    // Store the initial cursor position and the current height
    this.initialY = clientY;
    this.initialHeight = this.height; 
  }
}
