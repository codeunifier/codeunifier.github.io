import { Component, input } from '@angular/core';

@Component({
  selector: 'app-simple-stat',
  imports: [],
  templateUrl: './simple-stat.html',
  styleUrl: './simple-stat.scss'
})
export class SimpleStat {
  label = input<string>();
  value = input<number | string>();
}
