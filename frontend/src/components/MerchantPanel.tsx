import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Col, List, Row, Space, Tag, Typography } from 'antd';
import type { Order, Robot } from '../types';
import { ORDER_STATUS_LABEL } from '../types';

interface MerchantPanelProps {
  orders: Record<number, Order>;
  pendingIds: number[];
  completedIds: number[];
  robots: Robot[];
  onAddRobot: () => void;
  onRemoveRobot: (robotId: number) => void;
}

function OrderTag({ order }: { order: Order }) {
  return (
    <Tag color={order.isVip ? 'gold' : 'blue'}>
      #{order.id} {order.isVip ? 'VIP' : '普通'} · {ORDER_STATUS_LABEL[order.status]}
    </Tag>
  );
}

export function MerchantPanel({
  orders,
  pendingIds,
  completedIds,
  robots,
  onAddRobot,
  onRemoveRobot,
}: MerchantPanelProps) {
  return (
    <Card title="商家端" style={{ height: '100%' }}>
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Typography.Title level={5}>待处理</Typography.Title>
          <Space wrap>
            {pendingIds.length === 0 ? (
              <Typography.Text type="secondary">暂无待处理订单</Typography.Text>
            ) : (
              pendingIds.map((id) => {
                const order = orders[id];
                return order ? <OrderTag key={id} order={order} /> : null;
              })
            )}
          </Space>
        </Col>
        <Col span={12}>
          <Typography.Title level={5}>已完成</Typography.Title>
          <Space wrap>
            {completedIds.length === 0 ? (
              <Typography.Text type="secondary">暂无已完成订单</Typography.Text>
            ) : (
              completedIds.map((id) => {
                const order = orders[id];
                return order ? <OrderTag key={id} order={order} /> : null;
              })
            )}
          </Space>
        </Col>
      </Row>

      <div style={{ marginTop: 24 }}>
        <Space style={{ marginBottom: 12 }}>
          <Typography.Title level={5} style={{ margin: 0 }}>
            机器人列表
          </Typography.Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={onAddRobot}>
            添加机器人
          </Button>
        </Space>
        <List
          bordered
          dataSource={robots}
          locale={{ emptyText: '暂无机器人，点击添加机器人开始处理订单' }}
          renderItem={(robot) => {
            const currentOrder =
              robot.currentOrderId !== null ? orders[robot.currentOrderId] : null;

            return (
              <List.Item
                actions={[
                  <Button
                    key="delete"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => onRemoveRobot(robot.id)}
                  >
                    删除
                  </Button>,
                ]}
              >
                <Space>
                  <Typography.Text strong>机器人 #{robot.id}</Typography.Text>
                  <Tag color={robot.status === 'idle' ? 'default' : 'orange'}>
                    {robot.status === 'idle' ? '空闲' : '处理中'}
                  </Tag>
                  {currentOrder && (
                    <Typography.Text>
                      正在处理：#{currentOrder.id}
                      {currentOrder.isVip ? ' (VIP)' : ''}
                    </Typography.Text>
                  )}
                </Space>
              </List.Item>
            );
          }}
        />
      </div>
    </Card>
  );
}
