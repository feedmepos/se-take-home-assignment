import { useMemo } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { EventLog } from './components/EventLog';
import { OrderArea } from './components/OrderArea';
import { ProcessingArea } from './components/ProcessingArea';
import { getPendingOrders } from './domain/queue';
import { useOrderSystem } from './hooks/useOrderSystem';
import './App.css';

function App() {
  const { state, botProgress, actions } = useOrderSystem();
  const pendingOrders = getPendingOrders(state);

  const progressByBotId = useMemo(
    () => new Map(botProgress.map((item) => [item.botId, item])),
    [botProgress],
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

        <ProcessingArea bots={state.bots} progressByBotId={progressByBotId} />

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
