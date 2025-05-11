import React from 'react';
import { Row, Col } from 'antd';
import Bot from './Bot';
import { Bot as BotType } from '../types';

interface BotControllerProps {
  bots: BotType[];
}
const BotController: React.FC<BotControllerProps> = ({ bots }) => {
  return (
    <Row gutter={[16, 16]} data-testid="bot-controller">
      {bots.map(bot => (
        <Col key={bot.id} span={8}>
          <Bot bot={bot} />
        </Col>
      ))}
    </Row>
  );
};

export default BotController;