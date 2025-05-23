import React, { useEffect } from 'react';
import { Card, Tag, Progress } from 'antd';
import { RobotOutlined, LoadingOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { BotStatus, OrderType } from '../constants';
import { Bot as BotType } from '../types';

interface BotProps {
  bot: BotType;
}
const Bot: React.FC<BotProps> = ({ bot }) => {
  const isProcessing = bot.status === BotStatus.PROCESSING;

  return (
    <Card
      size="small"
      className="bot-card"
      data-testid={`bot-${bot.id}`}
    >
      <div style={{ textAlign: 'center' }}>
        <RobotOutlined style={{ fontSize: 24, marginBottom: 8 }} />
        <div>机器人 #{bot.id}</div>
        {isProcessing ? (
          <Tag color="processing" style={{ margin: '8px 0' }}>
            <LoadingOutlined /> 处理中,剩余{bot?.count ? bot.count : 0}秒
          </Tag>
        ) : (
          <Tag color="success" style={{ margin: '8px 0' }}>
            <CheckCircleOutlined /> 空闲
          </Tag>
        )}

        {isProcessing && bot.currentOrder && (
          <div>
            <div style={{ marginBottom: 4 }}>
              处理订单 #{bot.currentOrder.id}
              {bot.currentOrder.type === OrderType.VIP && (
                <Tag color="gold" style={{ marginLeft: 4, fontSize: '12px' }}>
                  VIP
                </Tag>
              )}
            </div>
            <Progress percent={100} status="active" />
          </div>
        )}
      </div>
    </Card>
  );
};

export default Bot;