import { Order } from "./order.type";

export type CompletedOrder = Order & {
  startedAt: Date;
  completedAt: Date;
  botId: number;
};
