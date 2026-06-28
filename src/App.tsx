import { useMemo } from 'react';
import { ControlBar } from './components/ControlBar';
import { OrderColumn } from './components/OrderColumn';
import { BotShelf } from './components/BotShelf';
import { useOrderSystem } from './hooks/useOrderSystem';
import { getProcessMs } from './config';

export default function App() {
  const processMs = useMemo(() => getProcessMs(), []);
  const { now, pending, complete, bots, botCount, actions } = useOrderSystem(processMs);

  return (
    <div className="app">
      <header className="app__header">
        <h1>
          <span className="app__logo" aria-hidden="true">
            M
          </span>
          McDonald&rsquo;s Order Controller
        </h1>
        <p className="app__subtitle">
          Automated cooking-bot order flow · {processMs / 1000}s per order
        </p>
      </header>

      <ControlBar
        botCount={botCount}
        onNewNormal={actions.newNormalOrder}
        onNewVip={actions.newVipOrder}
        onAddBot={actions.increaseBot}
        onRemoveBot={actions.decreaseBot}
      />

      <main className="board">
        <OrderColumn title="Pending" variant="pending" orders={pending} showPosition />
        <OrderColumn title="Complete" variant="complete" orders={complete} />
      </main>

      <BotShelf bots={bots} now={now} processMs={processMs} />
    </div>
  );
}
