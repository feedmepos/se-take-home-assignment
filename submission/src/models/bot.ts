import Order, { OrderDTO } from "./order";

export type BotDTO = {
  id: number;
  order: null | OrderDTO;
  created_at: string;
};

const processingTimeInMs = 10000;

export default class Bot {
  public id: number;
  public order: Order | null;
  private createdAt: string;
  private timeoutId?: NodeJS.Timeout;
  private onTaskDrop?: () => void;

  constructor(id: number) {
    this.id = id;
    this.order = null;
    this.createdAt = new Date().toISOString();
  }

  public process(order: Order, { onFailure }: { onFailure: () => void }) {
    this.dropTask();
    this.order = order;
    this.order.assign(this.id);
    this.timeoutId = setTimeout(this.complete.bind(this), processingTimeInMs);
    this.onTaskDrop = onFailure;
    console.log(`Bot ${this.id} processing order ${order.id}`);
  }

  public stop() {
    this.dropTask();
    console.log(`Bot ${this.id} stopped`);
  }

  public isIdle() {
    return this.order === null;
  }

  public toJSON(): BotDTO {
    return {
      id: this.id,
      order: this.order?.toJSON() ?? null,
      created_at: this.createdAt,
    };
  }

  private reset() {
    clearTimeout(this.timeoutId);
    this.order = null;
    this.onTaskDrop = undefined;
  }

  private dropTask() {
    this.order?.unassign();
    this.onTaskDrop?.();
    this.reset();
  }

  private complete() {
    this.order?.complete();
    this.reset();
  }
}
