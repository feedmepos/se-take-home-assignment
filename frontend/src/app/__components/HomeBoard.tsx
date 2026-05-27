"use client";

import { Badge, Card, Empty, Progress, Space, Tag, Typography } from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  FireOutlined,
  RobotOutlined,
} from "@ant-design/icons";

import { HomeBoardProps } from "@/types/home";
import { formatClock, formatSecondsLeft } from "@/utils";

const { Title, Text } = Typography;
const PROCESSING_DURATION_MS = 10_000;

const HomeBoard = ({ state, now }: HomeBoardProps) => {
  const pendingOrders = state.pendingOrderIds.map(
    (orderId) => state.ordersById[orderId],
  );
  const completeOrders = state.completeOrderIds.map(
    (orderId) => state.ordersById[orderId],
  );
  const processingOrders = Object.values(state.ordersById).filter(
    (order) => order.status === "PROCESSING",
  );
  const totalBots = state.bots.length;
  const idleBots = state.bots.filter((bot) => bot.status === "IDLE").length;

  return (
    <div className="home__board">
      <div className="home__stats-section">
        <div className="home__stat-card home__stat-card--pending">
          <div className="home__stat-icon">
            <ClockCircleOutlined />
          </div>
          <div className="home__stat-content">
            <div className="home__stat-number">{pendingOrders.length}</div>
            <div className="home__stat-label">Pending</div>
          </div>
        </div>

        <div className="home__stat-card home__stat-card--processing">
          <div className="home__stat-icon">
            <FireOutlined />
          </div>
          <div className="home__stat-content">
            <div className="home__stat-number">{processingOrders.length}</div>
            <div className="home__stat-label">Processing</div>
          </div>
        </div>

        <div className="home__stat-card home__stat-card--complete">
          <div className="home__stat-icon">
            <CheckCircleOutlined />
          </div>
          <div className="home__stat-content">
            <div className="home__stat-number">{completeOrders.length}</div>
            <div className="home__stat-label">Complete</div>
          </div>
        </div>

        <div className="home__stat-card home__stat-card--bots">
          <div className="home__stat-icon">
            <RobotOutlined />
          </div>
          <div className="home__stat-content">
            <div className="home__stat-number">{totalBots}</div>
            <div className="home__stat-label">Bots</div>
          </div>
        </div>
      </div>

      <div className="home__panels-grid">
        <Card
          className="home__panel home__panel--pending"
          variant="borderless"
          title={
            <div className="home__panel-heading">
              <Title level={3} className="home__panel-title">
                Pending Orders
              </Title>
              <Text type="secondary">
                Orders waiting for a bot to pick them up.
              </Text>
            </div>
          }
          extra={<Tag color="green">{pendingOrders.length}</Tag>}
        >
          {pendingOrders.length ? (
            pendingOrders.map((order, index) => (
              <Card
                key={order.id}
                className="home__order-card"
                variant="borderless"
              >
                <div className="home__order-card-head">
                  <Space size={8} align="center">
                    <Tag color={order.type === "VIP" ? "gold" : "default"}>
                      {order.type}
                    </Tag>
                    <Text strong>Order #{order.id}</Text>
                  </Space>
                  <Text type="secondary">
                    Queued at {formatClock(order.createdAt)}
                  </Text>
                </div>
                <div className="home__order-card-footer">
                  <Text type="secondary">Queue position</Text>
                  <Badge count={index + 1} />
                </div>
              </Card>
            ))
          ) : (
            <Empty description="No pending orders" />
          )}
        </Card>

        <Card
          className="home__panel home__panel--bots"
          variant="borderless"
          title={
            <div className="home__panel-heading">
              <Title level={3} className="home__panel-title">
                Bots Status
              </Title>
              <Text type="secondary">
                Each bot handles only one order at a time.
              </Text>
            </div>
          }
          extra={<Tag color="green">{idleBots}</Tag>}
        >
          {state.bots.length ? (
            state.bots.map((bot) => {
              const activeOrder =
                bot.orderId !== undefined
                  ? state.ordersById[bot.orderId]
                  : undefined;
              const remainingSeconds = formatSecondsLeft(
                bot.endsAt,
                now ?? Date.now(),
              );
              const progressPercent =
                bot.status === "WORKING"
                  ? Math.max(
                      0,
                      Math.min(
                        100,
                        ((PROCESSING_DURATION_MS - remainingSeconds * 1000) /
                          PROCESSING_DURATION_MS) *
                          100,
                      ),
                    )
                  : 0;

              return (
                <Card
                  key={bot.id}
                  className="home__bot-card"
                  variant="borderless"
                >
                  <div className="home__bot-card-head">
                    <Space size={8} align="center">
                      <Tag
                        color={bot.status === "WORKING" ? "volcano" : "green"}
                      >
                        Bot #{bot.id}
                      </Tag>
                      <Text strong>{bot.status}</Text>
                    </Space>
                    <Text type="secondary">
                      {bot.status === "WORKING"
                        ? `Finishes in ${remainingSeconds}s`
                        : "Waiting for work"}
                    </Text>
                  </div>

                  {bot.status === "WORKING" && activeOrder ? (
                    <>
                      <Progress
                        percent={progressPercent}
                        status="active"
                        showInfo={false}
                      />
                      <div className="home__bot-body">
                        <Text strong>Processing Order #{activeOrder.id}</Text>
                      </div>
                    </>
                  ) : (
                    <Empty
                      description="Idle until a new order arrives"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  )}
                </Card>
              );
            })
          ) : (
            <Empty description="No bots created yet" />
          )}
        </Card>

        <Card
          className="home__panel home__panel--complete"
          variant="borderless"
          title={
            <div className="home__panel-heading">
              <Title level={3} className="home__panel-title">
                Complete Orders
              </Title>
              <Text type="secondary">
                Finished orders appear here after 10 seconds.
              </Text>
            </div>
          }
          extra={<Tag color="green">{completeOrders.length}</Tag>}
        >
          {completeOrders.length ? (
            [...completeOrders].reverse().map((order) => (
              <Card
                key={order.id}
                className="home__order-card home__order-card--complete"
                variant="borderless"
              >
                <div className="home__order-card-head">
                  <Space size={8} align="center">
                    <Tag color="green">COMPLETE</Tag>
                    <Text strong>Order #{order.id}</Text>
                  </Space>
                  <Text type="secondary">
                    {order.completedAt
                      ? `Completed at ${formatClock(order.completedAt)}`
                      : "Completed"}
                  </Text>
                </div>
                <div className="home__order-card-footer">
                  <Text type="secondary">Customer type</Text>
                  <Tag color={order.type === "VIP" ? "gold" : "default"}>
                    {order.type}
                  </Tag>
                </div>
              </Card>
            ))
          ) : (
            <Empty description="Nothing complete yet" />
          )}
        </Card>
      </div>
    </div>
  );
};

export default HomeBoard;
