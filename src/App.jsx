import { useReducer, useState } from "react";
import { Layout, Button, Row, Col, Typography, Grid } from "antd";
import { PlusOutlined, RobotOutlined } from "@ant-design/icons";
import CreateOrderModal from "./components/CreateOrderModal";
import { ACTION_TYPES, BOT_STATUS, CUSTOMER_TYPES } from "./utils/enums";
import MobileFloatingActionButton from "./components/MobileFloatingActionButton";
import PendingOrdersList from "./components/PendingOrdersList";
import CompletedOrdersList from "./components/CompletedOrdersList";
import BotsList from "./components/BotsList";
import { assignOrdersToBots, createOrder } from "./utils/orderUtils";
import { useOrderTimers } from "./hooks/useOrderTimers";

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

const reducer = (state, action) => {
  switch (action.type) {

    case ACTION_TYPES.CREATE_ORDER: {
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

    case ACTION_TYPES.ADD_BOT: {
      const botNumber = state.bots.length + 1;

      const newBot = {
        id: botNumber,
        name: `Bot #${botNumber}`,
        status: BOT_STATUS.IDLE,
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

    case ACTION_TYPES.COMPLETE_ORDER: {
      const updatedBots = state.bots.map(bot =>
        bot.id === action.botId
          ? { ...bot, status: BOT_STATUS.IDLE, currentOrder: null }
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

    case ACTION_TYPES.REMOVE_BOT: {
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
  const screenSize = useBreakpoint();

  const handleCreateOrder = (customerType) => {
    dispatch({ type: ACTION_TYPES.CREATE_ORDER, customerType });
  };

  const handleOrderComplete = (botId, order) => {
    dispatch({
      type: ACTION_TYPES.COMPLETE_ORDER,
      botId,
      order,
    });
  };

  useOrderTimers(state.bots, handleOrderComplete);

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
            <Button icon={<RobotOutlined />} onClick={() => dispatch({ type: ACTION_TYPES.ADD_BOT })}>
              Add Bot
            </Button>
          </Col>
          <Col>
            <Button danger icon={[<RobotOutlined />]} onClick={() => dispatch({ type: ACTION_TYPES.REMOVE_BOT })}>
              Remove Bot
            </Button>
          </Col>
        </Row>

       <Row gutter={16} className="status-grid">
          <Col xs={24} md={8}>
            <PendingOrdersList orders={state.pending} />
          </Col>

          <Col xs={24} md={8}>
            <BotsList bots={state.bots} />
          </Col>

          <Col xs={24} md={8}>
            <CompletedOrdersList orders={state.completed} />
          </Col>
        </Row>
        <MobileFloatingActionButton
          onAddOrder={() => setIsModalOpen(true)}
          onAddBot={() => dispatch({ type: ACTION_TYPES.ADD_BOT })}
          onRemoveBot={() => dispatch({ type: ACTION_TYPES.REMOVE_BOT })}
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