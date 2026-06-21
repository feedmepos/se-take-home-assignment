import { Button, Card, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Order } from '../types';
import { ORDER_STATUS_LABEL } from '../types';

interface UserPanelProps {
  orders: Record<number, Order>;
  onCreateNormalOrder: () => void;
  onCreateVipOrder: () => void;
}

export function UserPanel({
  orders,
  onCreateNormalOrder,
  onCreateVipOrder,
}: UserPanelProps) {
  const dataSource = Object.values(orders).sort((a, b) => b.id - a.id);

  const columns: ColumnsType<Order> = [
    {
      title: '订单号',
      dataIndex: 'id',
      key: 'id',
      width: 90,
    },
    {
      title: 'VIP',
      dataIndex: 'isVip',
      key: 'isVip',
      width: 80,
      render: (isVip: boolean) =>
        isVip ? <Tag color="gold">VIP</Tag> : <Tag>普通</Tag>,
    },
    {
      title: '订单状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: Order['status']) => ORDER_STATUS_LABEL[status],
    },
  ];

  return (
    <Card title="用户端" style={{ height: '100%' }}>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={onCreateNormalOrder}>
          发起普通订单
        </Button>
        <Button type="primary" ghost onClick={onCreateVipOrder}>
          发起 VIP 订单
        </Button>
      </Space>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={dataSource}
        pagination={false}
        size="small"
        locale={{ emptyText: '暂无订单，点击上方按钮发起订单' }}
      />
    </Card>
  );
}
