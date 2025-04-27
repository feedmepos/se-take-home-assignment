import { OrderStatus } from "@/constant";

export type OrderDTO = {
  id: number;
  status: OrderStatus;
  assigned_bot_id: number | null;
  is_priority: boolean;
  created_at: string;
};

export default class Order {
  public id: number;
  public status: OrderStatus;
  public assignedBotId: number | null;
  public isPriority: boolean;
  public createdAt: string;

  constructor(id: number, isPriority: boolean) {
    this.id = id;
    this.status = OrderStatus.PENDING;
    this.assignedBotId = null;
    this.isPriority = isPriority;
    this.createdAt = new Date().toISOString();
  }

  public assign(botId: number): void {
    this.assignedBotId = botId;
    this.status = OrderStatus.PROCESSING;
  }

  public unassign(): void {
    this.assignedBotId = null;
    this.status = OrderStatus.PENDING;
  }

  public complete(): void {
    this.status = OrderStatus.COMPLETED;
    console.log(`Order ${this.id} completed`);
  }

  public toJSON(): OrderDTO {
    return {
      id: this.id,
      status: this.status,
      assigned_bot_id: this.assignedBotId,
      is_priority: this.isPriority,
      created_at: this.createdAt,
    };
  }
}
