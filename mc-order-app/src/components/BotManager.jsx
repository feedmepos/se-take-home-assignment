import { useOrder } from '../store/OrderContext';

export default function BotManager() {
  const { state, addBot, removeBot } = useOrder();
  const isManager = state.role === 'manager';

  return (
    <div className="panel-section">
      <h3>机器人管理</h3>
      {isManager && (
        <div style={{ marginBottom: 12 }}>
          <button className="btn btn-add" onClick={addBot}>
            + Bot
          </button>
          <button
            className="btn btn-remove"
            onClick={removeBot}
            disabled={state.bots.length === 0}
          >
            - Bot
          </button>
        </div>
      )}
      <div className="bot-list">
        {state.bots.length === 0 ? (
          <div style={{ color: '#ccc', fontSize: 13, textAlign: 'center', padding: 8 }}>
            暂无机器人
          </div>
        ) : (
          state.bots.map(bot => (
            <div key={bot.id} className="bot-item">
              <span className={`bot-dot ${bot.status}`} />
              <span>
                机器人 #{bot.id}
                {bot.status === 'processing' && bot.currentOrder && (
                  <> — 处理中: 订单 #{bot.currentOrder.id} ({bot.currentOrder.type === 'vip' ? 'VIP' : 'Normal'})</>
                )}
                {bot.status === 'idle' && ' — 空闲'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
