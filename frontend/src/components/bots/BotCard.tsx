import { Bot } from '../../models/bot';

export const BotCard: React.FC<{ bot: Bot }> = ({ bot }) => (
    <li className="bot">
        <strong>Bot #{bot.id}</strong>
        <div><b>Status:</b> {bot.status}</div>
        {bot.currentOrder && (
            <div>
                <b>Order:</b> #{bot.currentOrder.id} ({bot.currentOrder.type})<br />
                <b>Processing at:</b>{' '}
                {bot.currentOrder.processingAt?.toLocaleTimeString()}
            </div>
        )}
    </li>
);
