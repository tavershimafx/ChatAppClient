import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ChatHeadComponent } from './components/chat-head/chat-head.component';
import { FormsModule } from '@angular/forms';
import { ChatMessageComponent } from './components/chat-message/chat-message.component';
import { ModalDialogComponent } from './components/modal-dialog/modal-dialog.component';
import { DialogComponent } from './components/dialog/dialog.component';

@NgModule({
  declarations: [
    AppComponent,
    ChatHeadComponent,
    ChatMessageComponent,
    ModalDialogComponent,
    DialogComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
