import { Order } from "../lib/model";

export interface BotEventHandler {
  (order: Order, botId: number): void;
}

export enum BotStatus {
  IDLE = "IDLE",
  BUSY = "BUSY",
  STOPPED = "STOPPED",
}

export enum OrderManagerStatus {
  START = "START",
  STOP = "STOP",
}
