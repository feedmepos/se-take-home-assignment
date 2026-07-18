import { BotStatus, OrderType, type Bot, type Order } from '@/domain';
import { Badge } from '../../atoms/badge/Badge';
import {
  Badges,
  BotName,
  Card,
  CookBar,
  Dot,
  Face,
  Header,
  Identity,
  Task,
} from './BotCard.styles';

export interface BotCardProps {
  bot: Bot;
  /** The order this bot is currently cooking, used to show its tier. */
  order?: Order;
}

export function BotCard({ bot, order }: BotCardProps) {
  const isActive = bot.status === BotStatus.PROCESSING;
  const isVip = isActive && order?.type === OrderType.VIP;

  return (
    <Card $active={isActive} aria-label={`Bot ${bot.id}, ${bot.status}`}>
      <Header>
        <Identity>
          <Face $active={isActive} aria-hidden>
            {isActive ? '👨‍🍳' : '🤖'}
          </Face>
          <BotName>
            <Dot $active={isActive} aria-hidden />
            Bot #{bot.id}
          </BotName>
        </Identity>
        <Badges>
          {isVip && <Badge tone="vip">VIP</Badge>}
          <Badge tone={isActive ? 'active' : 'idle'}>
            {isActive ? 'Cooking' : 'Idle'}
          </Badge>
        </Badges>
      </Header>
      <Task>
        {isActive ? (
          <>
            Cooking <strong>Order #{bot.currentOrderId}</strong>
          </>
        ) : (
          'Waiting for orders 💤'
        )}
      </Task>
      {isActive && <CookBar aria-hidden />}
    </Card>
  );
}
