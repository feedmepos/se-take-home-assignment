import React from 'react';
import { List, Tag, Typography } from 'antd';
import { CrownOutlined } from '@ant-design/icons';
import { OrderType } from '../constants';
import { Order } from '../types';

const { Text } = Typography;

interface OrderListProps {
  orders: Order[];
  testId?: string;
}
const OrderList: React.FC<OrderListProps> = ({ orders, testId }) => {
  return (
    <List
      size="small"
      bordered
      dataSource={orders}
      data-testid={testId}
      renderItem={(order) => (
        <List.Item data-testid={`order-item-${order.id}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <div>
              <Text strong>订单 #{order.id}</Text>
              {order.type === OrderType.VIP ? (
                <Tag color="gold" style={{ marginLeft: 8 }} data-testid={`vip-tag-${order.id}`}>
                  <CrownOutlined /> VIP
                </Tag>
              ) : (
                <Tag color="blue" style={{ marginLeft: 8 }} data-testid={`normal-tag-${order.id}`}>
                  普通
                </Tag>
              )}
            </div>
            <Text type="secondary">
              {order?.createdAt && new Date(order.createdAt).toLocaleTimeString()}
            </Text>
          </div>
        </List.Item>
      )}
      locale={{ emptyText: '没有订单' }}
    />
  );
};

export default OrderList;