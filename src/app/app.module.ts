import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ChatHeadComponent } from './components/chat-head/chat-head.component';
import { FormsModule } from '@angular/forms';
import { ChatMessage } from './models/chat-models';
import { ChatMessageComponent } from './components/chat-message/chat-message.component';

@NgModule({
  declarations: [
    AppComponent,
    ChatHeadComponent,
    ChatMessageComponent
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
