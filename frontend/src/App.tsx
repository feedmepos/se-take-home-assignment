import { Col, Layout, Row, Typography } from 'antd';
import { MerchantPanel } from './components/MerchantPanel';
import { UserPanel } from './components/UserPanel';
import { useOrderSystem } from './useOrderSystem';

const { Header, Content } = Layout;

export default function App() {
  const {
    orders,
    pendingIds,
    completedIds,
    robots,
    createOrder,
    addRobot,
    removeRobot,
  } = useOrderSystem();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#001529' }}>
        <Typography.Title level={3} style={{
          color: '#fff',
          margin: 0,
          lineHeight: 64
         }}>
          FeedMe 订单控制器
        </Typography.Title>
      </Header>
      <Content style={{ padding: 24 }}>
        <Row gutter={24}>
          <Col span={12}>
            <UserPanel
              orders={orders}
              onCreateNormalOrder={() => createOrder(false)}
              onCreateVipOrder={() => createOrder(true)}
            />
          </Col>
          <Col span={12}>
            <MerchantPanel
              orders={orders}
              pendingIds={pendingIds}
              completedIds={completedIds}
              robots={robots}
              onAddRobot={addRobot}
              onRemoveRobot={removeRobot}
            />
          </Col>
        </Row>
      </Content>
    </Layout>
  );
}
