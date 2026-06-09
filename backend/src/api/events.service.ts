import { Injectable, MessageEvent, OnModuleDestroy } from '@nestjs/common';
import { Observable, Subject, concat, of } from 'rxjs';
import { OrderController } from '../domain/order-controller';
import { serializeSnapshot } from './serialize';

@Injectable()
export class EventsService implements OnModuleDestroy {
  private readonly subject = new Subject<MessageEvent>();
  private readonly unsubscribe: () => void;

  constructor(private readonly ctrl: OrderController) {
    this.unsubscribe = this.ctrl.subscribe(() => {
      this.subject.next({ data: serializeSnapshot(this.ctrl.snapshot()) });
    });
  }

  stream(): Observable<MessageEvent> {
    return concat(
      of({ data: serializeSnapshot(this.ctrl.snapshot()) }),
      this.subject.asObservable(),
    );
  }

  onModuleDestroy(): void {
    this.unsubscribe();
    this.subject.complete();
  }
}
