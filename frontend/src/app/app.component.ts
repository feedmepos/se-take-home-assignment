import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subscription, switchMap, timer } from 'rxjs';
import { environment } from '../environments/environment';

/** 与后端 JSON 对齐 */
export interface OrderRow {
  id: number;
  kind: string;
  status: string;
}

export interface BotRow {
  id: number;
  idle: boolean;
  orderId?: number;
}

export interface AppState {
  pending: OrderRow[];
  processing: OrderRow[];
  complete: OrderRow[];
  bots: BotRow[];
}

@Component({
  selector: 'app-root',
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);

  title = 'FeedMe Order Controller';
  state: AppState = { pending: [], processing: [], complete: [], bots: [] };
  message: string | null = null;

  private poll?: Subscription;

  ngOnInit(): void {
    const stateUrl = this.url('/api/state');
    this.poll = timer(0, 1000)
      .pipe(switchMap(() => this.http.get<AppState>(stateUrl)))
      .subscribe({
        next: (s) => {
          this.state = s;
        },
        error: () => this.flash('Failed to load state'),
      });
  }

  ngOnDestroy(): void {
    this.poll?.unsubscribe();
  }

  newNormalOrder(): void {
    this.http.post(this.url('/api/orders'), { kind: 'normal' }).subscribe({
      error: (e) => this.flashHttp(e),
    });
  }

  newVipOrder(): void {
    this.http.post(this.url('/api/orders'), { kind: 'vip' }).subscribe({
      error: (e) => this.flashHttp(e),
    });
  }

  addBot(): void {
    this.http.post(this.url('/api/bots'), { action: 'add' }).subscribe({
      error: (e) => this.flashHttp(e),
    });
  }

  removeBot(): void {
    this.http.post(this.url('/api/bots'), { action: 'remove' }).subscribe({
      error: (e) => this.flashHttp(e),
    });
  }

  private url(path: string): string {
    return `${environment.apiBaseUrl}${path}`;
  }

  private flash(msg: string): void {
    this.message = msg;
    setTimeout(() => (this.message = null), 4000);
  }

  private flashHttp(err: unknown): void {
    if (err instanceof HttpErrorResponse) {
      const body = err.error as { error?: string } | string;
      const text =
        typeof body === 'object' && body && 'error' in body && body.error
          ? String(body.error)
          : err.message;
      this.flash(text);
      return;
    }
    this.flash('Request failed');
  }
}
