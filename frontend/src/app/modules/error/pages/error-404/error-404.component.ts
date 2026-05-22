import { NgOptimizedImage } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-error-404',
  imports: [RouterLink, NgOptimizedImage],
  templateUrl: './error-404.component.html',
  styleUrl: './error-404.component.css',
})
export class Error404Component {}
