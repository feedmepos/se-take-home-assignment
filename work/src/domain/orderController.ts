export type OrderType = "vip" | "normal";
export type BotStatus = "idle" | "processing";

export const PROCESSING_TIME_MS = 10_000;

export interface Order {
  id: number;
  type: OrderType;
  sequence: number;
  createdAt: number;
}

export interface CompletedOrder extends Order {
  completedAt: number;
  botId: number;
}

export interface ProcessingOrder extends Order {
  startedAt: number;
  completesAt: number;
}

export interface Bot {
  id: number;
  status: BotStatus;
  currentOrder?: ProcessingOrder;
}

export interface LogEntry {
  id: number;
  at: number;
  message: string;
}

export interface ControllerState {
  pendingOrders: Order[];
  completedOrders: CompletedOrder[];
  bots: Bot[];
  nextOrderId: number;
  nextBotId: number;
  nextLogId: number;
  log: LogEntry[];
}

export type ControllerAction =
  | { type: "add-order"; orderType: OrderType; now: number }
  | { type: "add-bot"; now: number }
  | { type: "remove-bot"; now: number }
  | { type: "tick"; now: number }
  | { type: "reset"; now: number };

export const createInitialState = (): ControllerState => ({
  pendingOrders: [],
  completedOrders: [],
  bots: [],
  nextOrderId: 1,
  nextBotId: 1,
  nextLogId: 1,
  log: [],
});

export const controllerReducer = (
  state: ControllerState,
  action: ControllerAction,
): ControllerState => {
  switch (action.type) {
    case "add-order": {
      const order: Order = {
        id: state.nextOrderId,
        type: action.orderType,
        sequence: state.nextOrderId,
        createdAt: action.now,
      };

      return dispatchWork(
        withLog(
          {
            ...state,
            nextOrderId: state.nextOrderId + 1,
            pendingOrders: sortPendingOrders([...state.pendingOrders, order]),
          },
          action.now,
          `${labelOrder(order)} 已进入等待队列`,
        ),
        action.now,
      );
    }

    case "add-bot": {
      const bot: Bot = {
        id: state.nextBotId,
        status: "idle",
      };

      return dispatchWork(
        withLog(
          {
            ...state,
            nextBotId: state.nextBotId + 1,
            bots: [...state.bots, bot],
          },
          action.now,
          `机器人 #${bot.id} 已上线`,
        ),
        action.now,
      );
    }

    case "remove-bot": {
      const botToRemove = state.bots.at(-1);
      if (!botToRemove) {
        return withLog(state, action.now, "当前没有可移除的机器人");
      }

      const remainingBots = state.bots.slice(0, -1);
      const returnedOrders =
        botToRemove.status === "processing" && botToRemove.currentOrder
          ? [stripProcessingFields(botToRemove.currentOrder)]
          : [];

      const nextState = {
        ...state,
        bots: remainingBots,
        pendingOrders: sortPendingOrders([
          ...state.pendingOrders,
          ...returnedOrders,
        ]),
      };

      const message =
        returnedOrders.length > 0
          ? `机器人 #${botToRemove.id} 已移除，${labelOrder(returnedOrders[0])} 回到等待队列`
          : `机器人 #${botToRemove.id} 已移除`;

      return dispatchWork(withLog(nextState, action.now, message), action.now);
    }

    case "tick":
      return dispatchWork(completeReadyOrders(state, action.now), action.now);

    case "reset":
      return withLog(createInitialState(), action.now, "控制器已重置");

    default:
      return state;
  }
};

export const getRemainingSeconds = (bot: Bot, now: number): number | null => {
  if (bot.status !== "processing" || !bot.currentOrder) {
    return null;
  }

  return Math.max(0, Math.ceil((bot.currentOrder.completesAt - now) / 1000));
};

const dispatchWork = (
  state: ControllerState,
  now: number,
): ControllerState => {
  let nextState = state;

  // 只要同时存在空闲机器人和等待订单，就持续分配任务。
  // 这样新增机器人、新增订单、订单完成之后都可以复用同一套调度逻辑。
  while (true) {
    const idleBotIndex = nextState.bots.findIndex(
      (bot) => bot.status === "idle",
    );
    const nextOrder = nextState.pendingOrders[0];

    if (idleBotIndex === -1 || !nextOrder) {
      return nextState;
    }

    const processingOrder: ProcessingOrder = {
      ...nextOrder,
      startedAt: now,
      completesAt: now + PROCESSING_TIME_MS,
    };

    const bots = nextState.bots.map((bot, index) =>
      index === idleBotIndex
        ? {
            ...bot,
            status: "processing" as const,
            currentOrder: processingOrder,
          }
        : bot,
    );

    nextState = withLog(
      {
        ...nextState,
        pendingOrders: nextState.pendingOrders.slice(1),
        bots,
      },
      now,
      `机器人 #${bots[idleBotIndex].id} 开始处理 ${labelOrder(nextOrder)}`,
    );
  }
};

const completeReadyOrders = (
  state: ControllerState,
  now: number,
): ControllerState => {
  let completedOrders = state.completedOrders;
  let nextState = state;

  const bots = state.bots.map((bot) => {
    // 未到 10 秒的订单继续保持 processing，不做任何状态迁移。
    if (
      bot.status !== "processing" ||
      !bot.currentOrder ||
      bot.currentOrder.completesAt > now
    ) {
      return bot;
    }

    const completedOrder: CompletedOrder = {
      ...stripProcessingFields(bot.currentOrder),
      completedAt: now,
      botId: bot.id,
    };

    completedOrders = [...completedOrders, completedOrder];
    nextState = withLog(
      nextState,
      now,
      `机器人 #${bot.id} 完成了 ${labelOrder(completedOrder)}`,
    );

    return {
      id: bot.id,
      status: "idle" as const,
    };
  });

  return {
    ...nextState,
    bots,
    completedOrders,
  };
};

const sortPendingOrders = (orders: Order[]): Order[] =>
  [...orders].sort((a, b) => {
    // VIP 永远排在普通订单前面；同类型订单按创建顺序 FIFO。
    if (a.type !== b.type) {
      return a.type === "vip" ? -1 : 1;
    }

    return a.sequence - b.sequence;
  });

const stripProcessingFields = (order: ProcessingOrder): Order => ({
  id: order.id,
  type: order.type,
  sequence: order.sequence,
  createdAt: order.createdAt,
});

const labelOrder = (order: Pick<Order, "id" | "type">): string =>
  `${order.type === "vip" ? "VIP" : "普通"}订单 #${order.id}`;

const withLog = (
  state: ControllerState,
  at: number,
  message: string,
): ControllerState => ({
  ...state,
  nextLogId: state.nextLogId + 1,
  log: [
    {
      id: state.nextLogId,
      at,
      message,
    },
    ...state.log,
  ].slice(0, 12),
});
