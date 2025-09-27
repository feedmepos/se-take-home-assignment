import { Order, OrderStatus, OrderType } from './order.entity';

export interface OrderRepository {
  nextId(): number;
  save(order: Order): void;
  findAll(): Order[];
  findById(id: number): Order | undefined;
  update(order: Order): void;
  getStats(): { total: number; pending: number; processing: number; complete: number };
  getByStatus(status: OrderStatus): Order[];
  getNextPendingByPriority(): Order | null;
  cleanupCompleted(): number;
  validateIntegrity(): { isValid: boolean; issues: string[] };
  resetStuck(): number;
}


