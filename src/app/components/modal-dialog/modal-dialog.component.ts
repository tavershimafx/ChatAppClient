import { Component, Input } from '@angular/core';

@Component({
  selector: 'modal-dialog',
  templateUrl: './modal-dialog.component.html',
  styleUrls: ['./modal-dialog.component.css']
})
export class ModalDialogComponent {
  @Input("size") size: string = "md"
}
