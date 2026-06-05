import { BotCard } from './components/BotCard';
import { ControlPanel } from './components/ControlPanel';
import { EventLog } from './components/EventLog';
import { OrderArea } from './components/OrderArea';
import { getPendingOrders } from './domain/queue';
import { useOrderSystem } from './hooks/useOrderSystem';
import './App.css';

function App() {
  const { state, botProgress, actions } = useOrderSystem();
  const pendingOrders = getPendingOrders(state);

  const progressByBotId = new Map(
    botProgress.map((item) => [item.botId, item]),
  );

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <p className="app__eyebrow">FeedMe Take Home Assignment</p>
          <h1>McDonald&apos;s Order Controller</h1>
          <p className="app__subtitle">
            Manage VIP and normal orders with automated cooking bots.
          </p>
        </div>
        <div className="app__stats">
          <div>
            <span>Pending</span>
            <strong>{pendingOrders.length}</strong>
          </div>
          <div>
            <span>Bots</span>
            <strong>{state.bots.length}</strong>
          </div>
          <div>
            <span>Completed</span>
            <strong>{state.completedOrders.length}</strong>
          </div>
        </div>
      </header>

      <ControlPanel
        onNewNormalOrder={actions.newNormalOrder}
        onNewVipOrder={actions.newVipOrder}
        onAddBot={actions.addBot}
        onRemoveBot={actions.removeBot}
        canRemoveBot={state.bots.length > 0}
      />

      <main className="app__layout">
        <OrderArea
          title="Pending"
          orders={pendingOrders}
          emptyMessage="No orders waiting. Create a normal or VIP order to get started."
        />

        <section className="area area--bots">
          <header className="area__header">
            <h2>Processing</h2>
            <span className="area__count">{state.bots.length}</span>
          </header>
          <div className="area__content area__content--bots">
            {state.bots.length === 0 ? (
              <p className="area__empty">No bots available. Click + Bot to add one.</p>
            ) : (
              state.bots.map((bot) => {
                const progress = progressByBotId.get(bot.id);
                return (
                  <BotCard
                    key={bot.id}
                    bot={bot}
                    remainingMs={progress?.remainingMs ?? 0}
                    progress={progress?.progress ?? 0}
                  />
                );
              })
            )}
          </div>
        </section>

        <OrderArea
          title="Complete"
          orders={state.completedOrders}
          emptyMessage="Completed orders will appear here after bots finish processing."
        />
      </main>

      <EventLog entries={state.eventLog} />
    </div>
  );
}

export default App;
