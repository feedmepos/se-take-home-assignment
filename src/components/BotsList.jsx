import { Card } from "antd";

export default function BotsList({ bots }) {
  return (
    <Card title="Bots">
      <div className="card-content">
        {bots.map(bot => (
          <div key={bot.id} className="bot-item">
            <div className="bot-header">
              <span className="bot-number">{bot.name}</span>
              <span className={`status-pill ${bot.status.toLowerCase()}`}>
                {bot.status}
              </span>

              {bot.currentOrder && (
                <span className="bot-order">
                  #{bot.currentOrder.id} - {bot.currentOrder.customerType}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}