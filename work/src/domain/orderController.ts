/**
 * 订单控制器的核心业务模块。
 *
 * 这个文件不依赖 React，也不直接读取系统时间。外部代码通过 action 把当前时间
 * `now` 传进来，因此相同的 state + action 永远会得到相同的结果，便于单元测试。
 *
 * 状态流转可以简单理解为：
 * 等待队列（pendingOrders） -> 机器人处理中（bot.currentOrder）
 * -> 完成队列（completedOrders）。
 */

/** 订单类型：VIP 订单比普通订单拥有更高的等待优先级。 */
export type OrderType = "vip" | "normal";

/** 机器人只有空闲和处理中两种状态。 */
export type BotStatus = "idle" | "processing";

/** 每笔订单固定需要处理 10 秒，单位为毫秒。 */
export const PROCESSING_TIME_MS = 10_000;

/**
 * 一笔尚未完成的基础订单。
 * `sequence` 用于保证同类型订单先进先出；目前它与 id 相同，但语义不同。
 */
export interface Order {
  /** 对用户展示的唯一、递增编号。 */
  id: number;
  /** 订单类型，用于判断它是高优先级的 VIP 订单还是普通订单。 */
  type: OrderType;
  /** 入队顺序，数值越小表示越早创建。 */
  sequence: number;
  /** 创建订单时的 Unix 时间戳（毫秒）。 */
  createdAt: number;
}

/** 已完成订单会额外记录完成时间以及负责处理它的机器人。 */
export interface CompletedOrder extends Order {
  /** 订单实际完成时的 Unix 时间戳（毫秒）。 */
  completedAt: number;
  /** 完成这笔订单的机器人编号。 */
  botId: number;
}

/** 处理中订单会额外记录开始时间和预计完成时间。 */
export interface ProcessingOrder extends Order {
  /** 机器人开始处理订单时的 Unix 时间戳（毫秒）。 */
  startedAt: number;
  /** 订单预计完成时的 Unix 时间戳（毫秒）。 */
  completesAt: number;
}

/** 系统中的机器人及其当前工作状态。 */
export interface Bot {
  /** 机器人的唯一、递增编号。 */
  id: number;
  /** 当前状态：idle 表示空闲，processing 表示正在处理订单。 */
  status: BotStatus;
  /** 只有 status 为 processing 时才应存在 currentOrder。 */
  currentOrder?: ProcessingOrder;
}

/** 展示在页面事件日志区域中的一条记录。 */
export interface LogEntry {
  /** 日志的唯一、递增编号，React 渲染列表时也会将其用作 key。 */
  id: number;
  /** 事件发生时的 Unix 时间戳（毫秒）。 */
  at: number;
  /** 向用户展示的事件说明。 */
  message: string;
}

/**
 * 控制器的完整状态，也是 reducer 唯一需要维护的数据源。
 * `next*Id` 保存下一次应使用的编号，避免通过数组长度生成重复 ID。
 */
export interface ControllerState {
  /** 尚未被机器人领取的订单，始终按照业务优先级排列。 */
  pendingOrders: Order[];
  /** 已经处理完毕的订单。 */
  completedOrders: CompletedOrder[];
  /** 当前存在的全部机器人，包括空闲和处理中机器人。 */
  bots: Bot[];
  /** 创建下一笔订单时应使用的编号。 */
  nextOrderId: number;
  /** 创建下一个机器人时应使用的编号。 */
  nextBotId: number;
  /** 创建下一条日志时应使用的编号。 */
  nextLogId: number;
  /** 最近发生的事件，最新日志排在最前面，最多保存 12 条。 */
  log: LogEntry[];
}

/**
 * 页面可以发送给 reducer 的所有事件。
 * 这里使用 TypeScript 的可辨识联合：switch 判断 `type` 后，TypeScript 就能知道
 * 该 action 还具有哪些字段，例如 add-order 一定具有 orderType。
 */
export type ControllerAction =
  | { type: "add-order"; orderType: OrderType; now: number }
  | { type: "add-bot"; now: number }
  | { type: "remove-bot"; now: number }
  | { type: "tick"; now: number }
  | { type: "reset"; now: number };

/** 创建一个全新的空控制器。函数形式可保证每次都返回新的数组。 */
export const createInitialState = (): ControllerState => ({
  pendingOrders: [],
  completedOrders: [],
  bots: [],
  nextOrderId: 1,
  nextBotId: 1,
  nextLogId: 1,
  log: [],
});

/**
 * reducer 根据“旧状态 + 事件”计算新状态。
 * 它不会修改传入的 state，而是通过展开运算符、map、slice 等方式创建新对象，
 * 这符合 React reducer 对不可变状态更新的要求。
 */
export const controllerReducer = (
  state: ControllerState,
  action: ControllerAction,
): ControllerState => {
  switch (action.type) {
    case "add-order": {
      // 先使用 nextOrderId 创建订单，再把计数器递增，供下一笔订单使用。
      const order: Order = {
        id: state.nextOrderId,
        type: action.orderType,
        sequence: state.nextOrderId,
        createdAt: action.now,
      };

      // 订单入队并记录日志后，立刻尝试把它交给空闲机器人。
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

      // 新机器人先以 idle 状态加入，然后立即尝试领取等待中的订单。
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
      // 产品规则规定“-机器人”始终移除最后创建的机器人。
      const botToRemove = state.bots.at(-1);
      if (!botToRemove) {
        return withLog(state, action.now, "当前没有可移除的机器人");
      }

      // slice 返回新数组，不会直接修改原 bots 数组。
      const remainingBots = state.bots.slice(0, -1);

      // 如果机器人正在工作，需要把订单转回普通 Order，放回等待队列。
      // 使用数组是为了后面能统一通过展开语法合并；这里最多只会有一笔订单。
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

      // 回队订单有可能马上被其他空闲机器人领取，因此还要重新调度一次。
      return dispatchWork(withLog(nextState, action.now, message), action.now);
    }

    case "tick":
      // 先完成所有已到期订单，再让刚空闲下来的机器人领取下一批订单。
      return dispatchWork(completeReadyOrders(state, action.now), action.now);

    case "reset":
      // 重置全部业务状态，但仍留下一条“控制器已重置”日志。
      return withLog(createInitialState(), action.now, "控制器已重置");

    default:
      return state;
  }
};

/**
 * 计算机器人当前订单还剩多少整秒。
 * Math.ceil 让 1~999ms 显示为 1 秒；Math.max 防止界面短暂显示负数。
 * 空闲机器人没有倒计时，因此返回 null，而不是返回 0。
 */
export const getRemainingSeconds = (bot: Bot, now: number): number | null => {
  if (bot.status !== "processing" || !bot.currentOrder) {
    return null;
  }

  return Math.max(0, Math.ceil((bot.currentOrder.completesAt - now) / 1000));
};

/**
 * 调度所有当前可以开始的工作。
 *
 * 这个函数会反复匹配“第一个空闲机器人”和“等待队首订单”，直到机器人或订单
 * 至少一方用完。集中维护这段逻辑，可以让新增订单、新增机器人、完成订单和
 * 删除机器人后的重新分配都遵循完全相同的规则。
 */
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

    // 订单被领取时才写入处理时间。预计完成时间使用绝对时间，避免定时器误差累积。
    const processingOrder: ProcessingOrder = {
      ...nextOrder,
      startedAt: now,
      completesAt: now + PROCESSING_TIME_MS,
    };

    // map 创建新的 bots 数组，并且只替换本轮领取订单的机器人。
    const bots = nextState.bots.map((bot, index) =>
      index === idleBotIndex
        ? {
            ...bot,
            status: "processing" as const,
            currentOrder: processingOrder,
          }
        : bot,
    );

    // slice(1) 移除已经分配的队首订单。更新 nextState 后，while 继续尝试分配。
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

/**
 * 检查所有机器人，把到达 completesAt 的订单移入完成队列。
 * 该函数只负责“完成”，不会领取下一单；领取工作由调用方随后交给 dispatchWork。
 */
const completeReadyOrders = (
  state: ControllerState,
  now: number,
): ControllerState => {
  let completedOrders = state.completedOrders;
  let nextState = state;

  // 一次 tick 可能有多个机器人同时完成，所以需要检查每一个机器人。
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

    // 追加到数组末尾，让完成区保持完成顺序。
    completedOrders = [...completedOrders, completedOrder];
    nextState = withLog(
      nextState,
      now,
      `机器人 #${bot.id} 完成了 ${labelOrder(completedOrder)}`,
    );

    // 完成后机器人恢复为空闲，并移除 currentOrder。
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

/**
 * 返回一个按业务规则排列的新数组，不修改调用方传入的 orders：
 * 1. VIP 永远排在普通订单前面；
 * 2. 相同类型按 sequence 从小到大排列，即 FIFO（先进先出）。
 */
const sortPendingOrders = (orders: Order[]): Order[] =>
  [...orders].sort((a, b) => {
    // VIP 永远排在普通订单前面；同类型订单按创建顺序 FIFO。
    if (a.type !== b.type) {
      return a.type === "vip" ? -1 : 1;
    }

    return a.sequence - b.sequence;
  });

/**
 * 把 ProcessingOrder 转回基础 Order。
 * 机器人被删除时，startedAt/completesAt 已经失效，不能跟着订单回到等待队列。
 */
const stripProcessingFields = (order: ProcessingOrder): Order => ({
  id: order.id,
  type: order.type,
  sequence: order.sequence,
  createdAt: order.createdAt,
});

/** 统一生成人类可读的订单名称，避免各处重复拼接文字。 */
const labelOrder = (order: Pick<Order, "id" | "type">): string =>
  `${order.type === "vip" ? "VIP" : "普通"}订单 #${order.id}`;

/**
 * 在不修改原 state 的前提下新增一条日志。
 * 新日志放在数组开头，所以界面最先看到最新事件；slice(0, 12) 限制最多 12 条，
 * 防止日志无限增长。nextLogId 即使旧日志被裁剪，也会继续递增并保持唯一。
 */
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
