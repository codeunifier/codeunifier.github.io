import { Component, computed, input } from '@angular/core';
import { Colors } from '../../../constants/colors';
import { Teams } from '../../../models';
import { CommonModule } from '@angular/common';

export enum IndicatorType {
  Status = 'status',
  Team = 'team'
}

@Component({
  selector: 'app-simple-indicator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './simple-indicator.html',
  styleUrl: './simple-indicator.scss'
})
export class SimpleIndicator {
  type = input.required<IndicatorType>();
  label = input.required<string>();
  reverse = input<boolean>(false);

  color = computed(() => {
    const type = this.type();
    const label = this.label();

    switch (type) {
      case IndicatorType.Status:
        switch (label) {
          case 'Done':
            return Colors.Green;
          case 'In Progress':
            return Colors.Peach;
          case 'To Do':
            return Colors.Blue;
          default:
            return Colors.Gray;
        }
      case IndicatorType.Team:
      default:
        // CSS will handle the default color
        return '';
    }
  });

  iconShape = computed(() => {
    const type = this.type();
    const label = this.label();

    switch (type) {
      case IndicatorType.Status:
        return 'circle';
      case IndicatorType.Team:
        switch (label) {
          case Teams.Armadillo:
            return 'circle';
          case Teams.Backpack:
            return 'hexagon';
          case Teams.AI:
            return 'square';
          default:
            return 'triangle';
        }
      default:
        return 'unknown-icon';
    }
  });
}
