import { EventType, OrderType } from "./src/enum/type.js";

//this is an emulation of the sample provided (with a small variance)
export const eventQueue = [
  {
    delay: 0,
    eventType: EventType.ORDER_CREATE,
    options: {
      orderType: OrderType.NORMAL,
      orderProcessTime: 10,
    },
  },
  {
    delay: 1,
    eventType: EventType.ORDER_CREATE,
    options: {
      orderType: OrderType.VIP,
      orderProcessTime: 10,
    },
  },
  {
    delay: 1,
    eventType: EventType.ORDER_CREATE,
    options: {
      orderType: OrderType.NORMAL,
      orderProcessTime: 10,
    },
  },
  {
    delay: 14,
    eventType: EventType.ORDER_CREATE,
    options: {
      orderType: OrderType.VIP,
      orderProcessTime: 10,
    },
  },
  {
    delay: 2,
    eventType: EventType.BOT_CREATE,
  },
  {
    delay: 3,
    eventType: EventType.BOT_CREATE,
  },
  {
    delay: 24,
    eventType: EventType.BOT_KILL,
    options: {
      id: `2`,
    },
  },
];
