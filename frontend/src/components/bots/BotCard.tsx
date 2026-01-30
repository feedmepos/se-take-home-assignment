import { Bot } from '../../types/bot';

type Props = {
  bot: Bot;
};

export const BotCard: React.FC<Props> = ({ bot }) => {
  return (
    <li className="bot">
      <b>Bot #{bot.id}</b>
      <div>Status: {bot.status}</div>

      {bot.currentOrder ? (
        <>
          <div>
            Processing order #{bot.currentOrder.id} (
            {bot.currentOrder.type})
          </div>
          <div>
            Processing at:{' '}
            {bot.currentOrder.startedAt
              ? new Date(
                  bot.currentOrder.startedAt,
                ).toLocaleTimeString()
              : '-'}
          </div>
        </>
      ) : (
        <div className="idle">Idle</div>
      )}
    </li>
  );
};
