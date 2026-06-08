import { useKitchenConnection } from './hooks/useKitchenConnection';
import { Header } from './features/Header';
import { Metrics } from './features/Metrics';
import { ControlBar } from './features/ControlBar';
import { OrderBoard } from './features/OrderBoard';
import { BotPanel } from './features/BotPanel';

export function App(): JSX.Element {
  useKitchenConnection();

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-7 md:px-8 md:py-10">
      <Header />
      <Metrics />
      <ControlBar />
      <OrderBoard />
      <BotPanel />
      <footer className="pt-2 text-center text-[11px] font-medium uppercase tracking-[0.2em] text-fg/30">
        Each bot cooks one order in 10 seconds · VIP orders jump the queue
      </footer>
    </div>
  );
}
