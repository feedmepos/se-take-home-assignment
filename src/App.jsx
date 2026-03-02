import { useReducer, useEffect, useRef, useState } from "react";
import { Layout, Button, Row, Col, Typography, Card, Grid } from "antd";
import { PlusOutlined, RobotOutlined, MinusOutlined } from "@ant-design/icons";
import CreateOrderModal from "./components/CreateOrderModal";
import { EActionType, EBotStatus, ECustomerType } from "./utils/enums";
import MobileFloatingActionButton from "./components/MobileFloatingActionButton";
import PendingOrders from "./components/PendingOrdersList";
import CompletedOrders from "./components/CompletedOrdersList";
import BotsPanel from "./components/BotsList";

const { Header, Content } = Layout;
const { Title } = Typography;
const { useBreakpoint } = Grid;

const initialState = {
  vipCounter: 0,
  normalCounter: 0,
  pending: [],
  completed: [],
  bots: []
};

const assignOrdersToBots = (bots, pending) => {
  let remaining = [...pending];

  const updatedBots = bots.map(bot => {
    if (bot.status !== EBotStatus.Idle) return bot;
    if (!remaining.length) return bot;

    const vipIndex = remaining.findIndex(
      o => o.customerType === ECustomerType.VIP
    );

    const index = vipIndex !== -1 ? vipIndex : 0;
    const [order] = remaining.splice(index, 1);

    return {
      ...bot,
      status: EBotStatus.Busy,
      currentOrder: order,
    };
  });

  return { bots: updatedBots, pending: remaining };
}

const createOrder = (customerType, vipCounter, normalCounter) => {
  const isVip = customerType === ECustomerType.VIP;
  const counter = isVip ? vipCounter + 1 : normalCounter + 1;

  const idPrefix = isVip ? "V" : "N";
  const id = `${idPrefix}-${counter.toString().padStart(4, "0")}`;

  return {
    order: { id, customerType },
    vipCounter: isVip ? counter : vipCounter,
    normalCounter: !isVip ? counter : normalCounter,
  };
}

const reducer = (state, action) => {
  switch (action.type) {

    case EActionType.CREATE_ORDER: {
      const { order, vipCounter, normalCounter } = createOrder(
        action.customerType,
        state.vipCounter,
        state.normalCounter
      );

      const assignment = assignOrdersToBots(
        state.bots,
        [...state.pending, order]
      );

      return {
        ...state,
        vipCounter,
        normalCounter,
        bots: assignment.bots,
        pending: assignment.pending,
      };
    }

    case EActionType.ADD_BOT: {
      const botNumber = state.bots.length + 1;

      const newBot = {
        id: botNumber,
        name: `Bot #${botNumber}`,
        status: EBotStatus.Idle,
        currentOrder: null,
      };

      const assignment = assignOrdersToBots(
        [...state.bots, newBot],
        state.pending
      );

      return {
        ...state,
        bots: assignment.bots,
        pending: assignment.pending,
      };
    }

    case EActionType.COMPLETE_ORDER: {
      const updatedBots = state.bots.map(bot =>
        bot.id === action.botId
          ? { ...bot, status: EBotStatus.Idle, currentOrder: null }
          : bot
      );

      const assignment = assignOrdersToBots(updatedBots, state.pending);

      return {
        ...state,
        bots: assignment.bots,
        pending: assignment.pending,
        completed: [...state.completed, action.order],
      };
    }

    case EActionType.REMOVE_BOT: {
      if (!state.bots.length) return state;

      const botsCopy = [...state.bots];
      const removedBot = botsCopy.pop();

      const newPending = removedBot.currentOrder
        ? [removedBot.currentOrder, ...state.pending]
        : state.pending;

      const assignment = assignOrdersToBots(botsCopy, newPending);

      return {
        ...state,
        bots: assignment.bots,
        pending: assignment.pending,
      };
    }

    default:
      return state;
  }
};


export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const timersRef = useRef({});
  const screenSize = useBreakpoint();

  const handleCreateOrder = (customerType) => {
    dispatch({ type: EActionType.CREATE_ORDER, customerType });
  };

  useEffect(() => {
    const activeBotIds = new Set(state.bots.map(b => b.id));
    // Clear timers for removed bots
    Object.keys(timersRef.current).forEach(botId => {
      if (!activeBotIds.has(Number(botId))) {
        clearTimeout(timersRef.current[botId]);
        delete timersRef.current[botId];
      }
  });

  // Handle active bots
  state.bots.forEach(bot => {
    if (
      bot.status === EBotStatus.Busy &&
      bot.currentOrder &&
      !timersRef.current[bot.id]
    ) {
      timersRef.current[bot.id] = setTimeout(() => {
        dispatch({
          type: EActionType.COMPLETE_ORDER,
          botId: bot.id,
          order: bot.currentOrder,
        });

        delete timersRef.current[bot.id];
      }, 10000);
    }

    if (bot.status === EBotStatus.Idle && timersRef.current[bot.id]) {
      clearTimeout(timersRef.current[bot.id]);
      delete timersRef.current[bot.id];
    }
  });
}, [state.bots]);

  return (
    <Layout style={{ minHeight: "100vh", width: "100%" }}>
      <Header style={{ background: "#fff", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Title level={screenSize.xs ? 4 : 3}>🍔 McDonald's Bot Controller</Title>
      </Header>

      <Content style={{ padding: 20 }}>
        <Row gutter={[12, 12]} style={{ marginBottom: 20, display: screenSize.xs ? 'none' : 'flex' }}>
          <Col>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
              Add Order
            </Button>
          </Col>
          <Col>
            <Button icon={<RobotOutlined />} onClick={() => dispatch({ type: EActionType.ADD_BOT })}>
              Add Bot
            </Button>
          </Col>
          <Col>
            <Button danger icon={[<RobotOutlined />]} onClick={() => dispatch({ type: EActionType.REMOVE_BOT })}>
              Remove Bot
            </Button>
          </Col>
        </Row>

       <Row gutter={16} className="status-grid">
          <Col xs={24} md={8}>
            <PendingOrders orders={state.pending} />
          </Col>

          <Col xs={24} md={8}>
            <BotsPanel bots={state.bots} />
          </Col>

          <Col xs={24} md={8}>
            <CompletedOrders orders={state.completed} />
          </Col>
        </Row>
        <MobileFloatingActionButton
          onAddOrder={() => setIsModalOpen(true)}
          onAddBot={() => dispatch({ type: EActionType.ADD_BOT })}
          onRemoveBot={() => dispatch({ type: EActionType.REMOVE_BOT })}
        />

        <CreateOrderModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onCreate={handleCreateOrder}
        />
      </Content>
    </Layout>
  );
}