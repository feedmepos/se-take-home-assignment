import React from 'react';
import { Layout } from 'antd';
import OrderController from './components/OrderController';
const { Header, Content, Footer } = Layout;
const App: React.FC = () => {
  return (
    <Layout className="layout">
      <Header className="header" style={{ marginBottom:"24px" }}>
        <div className="logo" style={{ color:'#fff', fontSize:'28px' }}>订单控制系统</div>
      </Header>
      <Content className="content">
        <div className="site-layout-content">
          <OrderController />
        </div>
      </Content>
      <Footer style={{ textAlign: 'center' }}>
        订单控制系统 ©2025
      </Footer>
    </Layout>
  );
};

export default App;