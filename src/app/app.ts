import { Component } from '@angular/core';
import { VisualizerComponent } from './components/visualizer/visualizer.component';

@Component({
  selector: 'app-root',
  imports: [VisualizerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {}
