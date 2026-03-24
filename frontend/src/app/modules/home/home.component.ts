import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlPanelComponent } from './components/control-panel/control-panel.component';
import { OrderBoardComponent } from './components/order-board/order-board.component';
import { BotBoardComponent } from './components/bot-board/bot-board.component';
import { CompleteBoardComponent } from './components/complete-board/complete-board.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule, 
    ControlPanelComponent, 
    OrderBoardComponent, 
    BotBoardComponent, 
    CompleteBoardComponent
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {}
