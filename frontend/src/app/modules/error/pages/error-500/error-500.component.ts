import { NgOptimizedImage } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-error-500',
  imports: [RouterLink, NgOptimizedImage],
  templateUrl: './error-500.component.html',
  styleUrl: './error-500.component.css',
})
export class Error500Component {}
