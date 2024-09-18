import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Store } from '@ngrx/store';
import { Router } from '@angular/router';
import { BASE_URL } from 'src/app/utilities/constants';


@Component({
  selector: 'login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, OnDestroy{
 
  email?: string
  password?: string
  erMsg?: string
  constructor(private httpClient:HttpClient, private router: Router){

  }

  ngOnInit(): void {
    
  }

  ngOnDestroy(): void {
   
  }

  login(){
    this.email = this.email?.trim()
    this.password = this.password?.trim()
    if(!this.email || !this.password){
      this.erMsg = "Please enter an email and password"
      return
    }

    this.erMsg = undefined
    this.httpClient.post(BASE_URL + `login`, { Username: this.email, Password: this.password}, { withCredentials: true}).subscribe({
      next: (x) =>{
        this.router.navigateByUrl("/chat")
      },error: (x) =>{
        
      }
    })
  }
}