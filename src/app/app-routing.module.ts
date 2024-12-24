import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AppComponent } from './app.component';
import { LoginComponent } from './pages/login/login.component';
import { ChatComponent } from './pages/chat/chat.component';
import { DictaphoneComponent } from './pages/dictaphone/dictaphone.component';
import { FakeDataComponent } from './pages/fake-data/fake-data.component';

const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'chat', component: ChatComponent },
  { path: 'dictaphone', component: DictaphoneComponent },
  { path: 'faker', component: FakeDataComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
