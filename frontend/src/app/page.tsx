"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { Alert, Badge, Card, Col, Row, Statistic, Typography } from "antd";

import { Action, Order, OrderState, OrderType } from "@/types/home";
import { formatClock } from "@/utils";

import { HomeBoard, HomeBrandBar, HomeFloatActions } from "./__components";

const { Title, Paragraph, Text } = Typography;
const PROCESSING_DURATION_MS = 10_000;

const initialState: OrderState = {
  nextOrderId: 1,
  nextBotId: 1,
  ordersById: {},
  pendingOrderIds: [],
  completeOrderIds: [],
  bots: [],
};

const getPriority = (orderType: OrderType): number => {
  return orderType === "VIP" ? 0 : 1;
};

const insertPendingOrder = (
  pendingOrderIds: number[],
  ordersById: Record<number, Order>,
  orderId: number,
) => {
  const nextPending = [...pendingOrderIds];
  const nextOrder = ordersById[orderId];
  const nextPriority = getPriority(nextOrder.type);

  const insertIndex = nextPending.findIndex((existingOrderId) => {
    const existingOrder = ordersById[existingOrderId];
    const existingPriority = getPriority(existingOrder.type);

    if (nextPriority < existingPriority) {
      return true;
    }

    if (nextPriority > existingPriority) {
      return false;
    }

    return nextOrder.id < existingOrder.id;
  });

  if (insertIndex === -1) {
    nextPending.push(orderId);
  } else {
    nextPending.splice(insertIndex, 0, orderId);
  }

  return nextPending;
};

const assignIdleBots = (state: OrderState, now: number): OrderState => {
  if (
    !state.pendingOrderIds.length ||
    !state.bots.some((bot) => bot.status === "IDLE")
  ) {
    return state;
  }

  const ordersById = { ...state.ordersById };
  const pendingOrderIds = [...state.pendingOrderIds];
  const bots = state.bots.map((bot) => ({ ...bot }));

  for (const bot of bots) {
    if (!pendingOrderIds.length) {
      break;
    }

    if (bot.status !== "IDLE") {
      continue;
    }

    const orderId = pendingOrderIds.shift();

    if (orderId === undefined) {
      break;
    }

    const order = ordersById[orderId];

    ordersById[orderId] = {
      ...order,
      status: "PROCESSING",
      startedAt: now,
    };

    bot.status = "WORKING";
    bot.orderId = orderId;
    bot.startedAt = now;
    bot.endsAt = now + PROCESSING_DURATION_MS;
  }

  return {
    ...state,
    ordersById,
    pendingOrderIds,
    bots,
  };
};

const reducer = (state: OrderState, action: Action): OrderState => {
  switch (action.type) {
    case "ADD_ORDER": {
      const orderId = state.nextOrderId;
      const newOrder: Order = {
        id: orderId,
        type: action.orderType,
        status: "PENDING",
        createdAt: action.now,
      };
      const ordersById = {
        ...state.ordersById,
        [orderId]: newOrder,
      };

      return assignIdleBots(
        {
          ...state,
          nextOrderId: orderId + 1,
          ordersById,
          pendingOrderIds: insertPendingOrder(
            state.pendingOrderIds,
            ordersById,
            orderId,
          ),
        },
        action.now,
      );
    }

    case "ADD_BOT": {
      const botId = state.nextBotId;

      return assignIdleBots(
        {
          ...state,
          nextBotId: botId + 1,
          bots: [
            ...state.bots,
            {
              id: botId,
              status: "IDLE",
            },
          ],
        },
        action.now,
      );
    }

    case "REMOVE_NEWEST_BOT": {
      if (!state.bots.length) {
        return state;
      }

      const bots = [...state.bots];
      const removedBot = bots.pop();

      if (!removedBot) {
        return state;
      }

      let ordersById = state.ordersById;
      let pendingOrderIds = state.pendingOrderIds;

      if (removedBot.status === "WORKING" && removedBot.orderId !== undefined) {
        const activeOrder = ordersById[removedBot.orderId];
        const returnedOrder: Order = {
          ...activeOrder,
          status: "PENDING",
          startedAt: undefined,
        };

        ordersById = {
          ...ordersById,
          [removedBot.orderId]: returnedOrder,
        };

        pendingOrderIds = insertPendingOrder(
          pendingOrderIds,
          ordersById,
          removedBot.orderId,
        );
      }

      return assignIdleBots(
        {
          ...state,
          bots,
          ordersById,
          pendingOrderIds,
        },
        action.now,
      );
    }

    case "COMPLETE_ORDER": {
      const botIndex = state.bots.findIndex((bot) => bot.id === action.botId);

      if (botIndex === -1) {
        return state;
      }

      const bot = state.bots[botIndex];

      if (bot.status !== "WORKING" || bot.orderId === undefined) {
        return state;
      }

      const order = state.ordersById[bot.orderId];
      const completedOrder: Order = {
        ...order,
        status: "COMPLETE",
        completedAt: action.now,
      };

      const ordersById = {
        ...state.ordersById,
        [bot.orderId]: completedOrder,
      };

      const bots = [...state.bots];
      bots[botIndex] = {
        ...bot,
        status: "IDLE",
        orderId: undefined,
        startedAt: undefined,
        endsAt: undefined,
      };

      return assignIdleBots(
        {
          ...state,
          bots,
          ordersById,
          completeOrderIds: [...state.completeOrderIds, bot.orderId],
        },
        action.now,
      );
    }

    default:
      return state;
  }
};

const Home = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [now, setNow] = useState<number | null>(null);
  const timersRef = useRef<Record<number, number>>({});

  useEffect(() => {
    setNow(Date.now());

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const activeBotIds = new Set(
      state.bots
        .filter((bot) => bot.status === "WORKING" && bot.orderId !== undefined)
        .map((bot) => bot.id),
    );

    for (const [botIdString, timerId] of Object.entries(timersRef.current)) {
      const botId = Number(botIdString);

      if (!activeBotIds.has(botId)) {
        window.clearTimeout(timerId);
        delete timersRef.current[botId];
      }
    }

    for (const bot of state.bots) {
      if (bot.status !== "WORKING" || bot.orderId === undefined) {
        continue;
      }

      if (timersRef.current[bot.id] !== undefined) {
        continue;
      }

      const remainingMs = Math.max(
        0,
        (bot.endsAt ?? (now ?? Date.now()) + PROCESSING_DURATION_MS) -
          Date.now(),
      );

      timersRef.current[bot.id] = window.setTimeout(() => {
        delete timersRef.current[bot.id];

        dispatch({
          type: "COMPLETE_ORDER",
          botId: bot.id,
          now: Date.now(),
        });
      }, remainingMs);
    }
  }, [state.bots, now]);

  useEffect(() => {
    return () => {
      for (const timerId of Object.values(timersRef.current)) {
        window.clearTimeout(timerId);
      }
      timersRef.current = {};
    };
  }, []);

  const workingBots = state.bots.filter(
    (bot) => bot.status === "WORKING",
  ).length;

  const onAddNormalOrder = () => {
    dispatch({ type: "ADD_ORDER", orderType: "NORMAL", now: Date.now() });
  };

  const onAddVIPOrder = () => {
    dispatch({ type: "ADD_ORDER", orderType: "VIP", now: Date.now() });
  };

  const onAddBot = () => {
    dispatch({ type: "ADD_BOT", now: Date.now() });
  };

  const onRemoveBot = () => {
    dispatch({ type: "REMOVE_NEWEST_BOT", now: Date.now() });
  };

  return (
    <div className="home">
      <div className="home__content">
        <HomeBrandBar />

        <div className="home__hero">
          <div className="home__hero-copy">
            <Title level={1} className="home__title">
              Priority order routing for VIP and normal customers.
            </Title>
            <Paragraph className="home__description">
              A single-screen prototype showing the full order flow inside
              memory. New orders land in the pending queue, VIP orders stay
              ahead of normal orders, and bots process one order at a time for
              10 seconds.
            </Paragraph>
          </div>

          <Card className="home__hero-card" variant="borderless">
            <div className="home__hero-card-top">
              <Badge status="processing" text="Live in-memory simulation" />
              <Text className="home__clock">
                {now === null ? "--:--:--" : formatClock(now)}
              </Text>
            </div>

            <Row gutter={[16, 16]}>
              <Col xs={12} sm={12} md={6}>
                <Statistic title="Bots" value={state.bots.length} />
              </Col>
              <Col xs={12} sm={12} md={6}>
                <Statistic
                  title="Pending"
                  value={state.pendingOrderIds.length}
                />
              </Col>
              <Col xs={12} sm={12} md={6}>
                <Statistic
                  title="Complete"
                  value={state.completeOrderIds.length}
                />
              </Col>
              <Col xs={12} sm={12} md={6}>
                <Statistic title="Working" value={workingBots} />
              </Col>
            </Row>
          </Card>
        </div>

        <Alert
          className="home__rules"
          type="info"
          showIcon
          message="Queue rules"
          description="VIP orders are inserted ahead of normal orders, but always behind any VIP orders already waiting. Removing the newest bot requeues its active order back into the pending list."
        />

        <HomeBoard state={state} now={now} />
      </div>

      <HomeFloatActions
        onAddNormalOrder={onAddNormalOrder}
        onAddVIPOrder={onAddVIPOrder}
        onAddBot={onAddBot}
        onRemoveBot={onRemoveBot}
      />
    </div>
  );
};

export default Home;
