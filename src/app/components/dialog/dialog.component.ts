import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';

@Component({
  selector: 'dialog-box',
  templateUrl: './dialog.component.html',
  styleUrls: ['./dialog.component.css']
})
export class DialogComponent implements OnInit, OnDestroy {
  @Input("size") size: string = "sm"
  @ViewChild("bodx", { static: true }) bodx! : ElementRef
  @Input() close?: boolean
  @Output() closeChange: EventEmitter<boolean> = new EventEmitter()

  constructor(){
    
  }

  ngOnInit(): void {
    setTimeout(() => {
      window.addEventListener("click", (e:MouseEvent) =>{
        let el = this.bodx.nativeElement.getBoundingClientRect()
        let b = this.isInbound(el.top, el.left, el.bottom, el.right, e.clientX, e.clientY)
        if (!b){
          this.closeChange.emit(false)
        }
      })
    }, 600);
  }

  ngOnDestroy(): void {
    window.removeEventListener("click", (e:MouseEvent) =>{})
  }

  /**
   * Determines if a point @param px @param py is within the area of the points
   * given in the parameters. Area for calculating if a point is in bound is
   * given by
   * @param top 
   * @param left 
   * @param bottom 
   * @param right 
   * @param px The x point of interest in the cartesian plane
   * @param py The y point of interest in the cartesian plane
   * @returns 
   */
  isInbound(top:number, left:number, bottom:number, right:number, px:number, py:number){
    let p1: Point = { x: left, y: top }
    let p2: Point = { x: right, y: top }
    let p3: Point = { x: right, y: bottom }
    let p4: Point = { x: left, y: bottom }

    // p1---------------p2
    // |                |
    // |                |
    // |                |
    // p4---------------p3
    return (px >= p1.x && px <= p2.x && px <= p3.x && px >= p4.x) &&
            (py >= p1.y && py >= p2.y && py <= p3.y && py <= p4.y)
  }
}

interface Point{
  x: number
  y: number
}
