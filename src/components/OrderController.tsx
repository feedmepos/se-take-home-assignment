import React from 'react';
import { Row, Col, Button, Card, Typography, Divider } from 'antd';
import { PlusOutlined, MinusOutlined, UserOutlined, CrownOutlined } from '@ant-design/icons';
import OrderList from './OrderList';
import BotController from './BotController';
import useOrderSystem from '../hooks/useOrderSystem';

const OrderController: React.FC = () => {
  const {
    bots,
    createNormalOrder,
    createVipOrder,
    addBot,
    removeBot,
    getPendingOrders,
    getProcessingOrders,
    getCompletedOrders,
  } = useOrderSystem();

  return (
    <div className="order-controller" data-testid="order-controller">
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={12}>
          <Card title="订单控制">
            <Button
              type="primary"
              icon={<UserOutlined />}
              onClick={createNormalOrder}
              style={{ marginRight: 16 }}
              data-testid="add-normal-order-btn"
            >
              新普通订单
            </Button>
            <Button
              type="primary"
              icon={<CrownOutlined />}
              onClick={createVipOrder}
              style={{ backgroundColor: '#FFD700', borderColor: '#FFD700' }}
              data-testid="add-vip-order-btn"
            >
              新VIP订单
            </Button>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="机器人控制">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={addBot}
              style={{ marginRight: 16 }}
              data-testid="add-bot-btn"
            >
              添加机器人
            </Button>
            <Button
              danger
              icon={<MinusOutlined />}
              onClick={removeBot}
              data-testid="remove-bot-btn"
            >
              移除机器人
            </Button>
            <Divider style={{ margin: '16px 0' }} />
            <BotController bots={bots} />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Card title="待处理订单" className="order-card">
            {/* 在 OrderList 组件调用处添加 testId 属性 */}
            <OrderList
              orders={getPendingOrders()}
              testId="pending-orders"
              data-testid="pending-orders-list" // 新增
            />
            
            {/* 在 OrderList 组件内部添加订单项 testid */}
          </Card>
        </Col>
        <Col span={8}>
          <Card title="处理中订单" className="order-card">
            <OrderList
              orders={getProcessingOrders()}
              testId="processing-orders"
              data-testid="processing-orders-list"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="已完成订单" className="order-card">
            <OrderList
              orders={getCompletedOrders()}
              testId="completed-orders"
              data-testid="completed-orders-list"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default OrderController;
