"use client";

import { Button, Card, Space, Typography } from "antd";
import { CrownOutlined, ToolOutlined,UserOutlined } from "@ant-design/icons";

import { UserRole } from "@/types/home";

const { Text, Title } = Typography;

interface HomeControlPanelProps {
  role: UserRole;
  totalBots: number;
  onAddNormalOrder: () => void;
  onAddVIPOrder: () => void;
  onAddBot: () => void;
  onRemoveBot: () => void;
}

const roleDescriptions: Record<UserRole, string> = {
  CUSTOMER: "Can place normal orders only.",
  VIP: "Can place VIP orders only.",
  MANAGER: "Can manage cooking bots only.",
};

const roleIcons: Record<UserRole, React.ReactNode> = {
  CUSTOMER: <UserOutlined />,
  VIP: <CrownOutlined />,
  MANAGER: <ToolOutlined />,
};

const roleLabels: Record<UserRole, string> = {
  CUSTOMER: "Customer",
  VIP: "VIP Member",
  MANAGER: "Manager",
};

const HomeControlPanel = ({
  role,
  totalBots,
  onAddNormalOrder,
  onAddVIPOrder,
  onAddBot,
  onRemoveBot,
}: HomeControlPanelProps) => {
  return (
    <Card className="home__control-panel" variant="borderless">
      <div className="home__control-panel-header">
        <div className="home__control-panel-heading">
          <div className="home__control-panel-role-badge">
            {roleIcons[role]}
            <Title level={4} className="home__control-panel-role-title">
              {roleLabels[role]}
            </Title>
          </div>
          <Text type="secondary" className="home__control-panel-summary">
            {roleDescriptions[role]}
          </Text>
        </div>
      </div>

      <div className="home__control-panel-actions">
        {role === "CUSTOMER" && (
          <Button type="primary" size="large" onClick={onAddNormalOrder}>
            Add Order
          </Button>
        )}

        {role === "VIP" && (
          <Button type="primary" size="large" onClick={onAddVIPOrder}>
            Add VIP Order
          </Button>
        )}

        {role === "MANAGER" && (
          <Space size={12} wrap>
            <Button type="primary" size="large" onClick={onAddBot}>
              Add Bot
            </Button>
            <Button
              danger
              size="large"
              disabled={totalBots === 0}
              onClick={onRemoveBot}
            >
              Remove Bot
            </Button>
          </Space>
        )}
      </div>
    </Card>
  );
};

export default HomeControlPanel;
