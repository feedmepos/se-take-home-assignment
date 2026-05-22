export type UserPrivilege = "Normal" | "VIP";
export type OrderStatus = "PENDING" | "PROCESSING" | "COMPLETE";

export interface User {
  id: number;
  privilege: UserPrivilege; // User permission levels
}

export interface Order {
  id: number;
  userId?: User["id"]; // Optional: For future expansion/narration
  privilege: UserPrivilege;
  status: OrderStatus;
  createdAtMs: number;
}

export type BotState = "IDLE" | "WORKING" | "STOPPED";

export interface Bot {
  id: number;
  state: BotState;
  currentOrder?: Order;
  cancelToken?: { cancelled: boolean };
}

export type EngineEvent =
  | { type: "BOT_ADDED"; botId: Bot["id"]; botsCount: number }
  | { type: "BOT_REMOVED"; botId: Bot["id"]; botsCount: number }
  | {
      type: "BOT_CANCELLED";
      botId: Bot["id"];
      orderId: Order["id"];
      botsCount: number;
    }
  | {
      type: "ORDER_ENQUEUED";
      orderId: Order["id"];
      privilege: Order["privilege"];
    }
  | {
      type: "ORDER_PICKED";
      botId: Bot["id"];
      orderId: Order["id"];
      privilege: Order["privilege"];
    }
  | {
      type: "ORDER_COMPLETED";
      botId: Bot["id"];
      orderId: Order["id"];
      privilege: Order["privilege"];
      processingMs: number;
    }
  | { type: "BOT_IDLE"; botId: Bot["id"] };
