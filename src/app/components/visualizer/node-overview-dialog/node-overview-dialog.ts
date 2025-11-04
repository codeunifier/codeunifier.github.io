import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { JiraTicket } from '../../../models';

@Component({
  selector: 'app-node-overview-dialog',
  standalone: true,
  imports: [MatDialogModule],
  templateUrl: './node-overview-dialog.html',
  styleUrl: './node-overview-dialog.scss'
})
export class NodeOverviewDialog {
  ticket: JiraTicket;
  
  constructor(
    public dialogRef: MatDialogRef<NodeOverviewDialog>,
    @Inject(MAT_DIALOG_DATA) public data: JiraTicket
  ) {
    this.ticket = data;
  }
}
