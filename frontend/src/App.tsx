import { useEventSource, type EventSourceLike } from './hooks/useEventSource';
import { newOrder, addBot, delBot } from './api/client';
import { Controls } from './components/Controls';
import { PendingList } from './components/PendingList';
import { BotList } from './components/BotList';
import { CompleteList } from './components/CompleteList';

interface AppProps {
  eventSourceFactory?: (url: string) => EventSourceLike;
}

export default function App({ eventSourceFactory }: AppProps): React.ReactElement {
  const { snapshot, status } = useEventSource('/api/events', eventSourceFactory);

  const indicatorLabel =
    status === 'connected'
      ? 'Live'
      : status === 'reconnecting'
      ? 'Reconnecting…'
      : 'Connecting…';

  const indicatorClass =
    status === 'connected'
      ? 'badge badge-success'
      : status === 'reconnecting'
      ? 'badge badge-warning'
      : 'badge badge-ghost';

  function handleNewNormal(): void {
    newOrder('NORMAL').catch((err: unknown) => console.error(err));
  }

  function handleNewVip(): void {
    newOrder('VIP').catch((err: unknown) => console.error(err));
  }

  function handleAddBot(): void {
    addBot().catch((err: unknown) => console.error(err));
  }

  function handleDelBot(): void {
    delBot().catch((err: unknown) => console.error(err));
  }

  return (
    <div className="min-h-screen bg-base-200 p-4">
      <header className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">McDonald's Order Controller</h1>
        <span className={indicatorClass}>{indicatorLabel}</span>
      </header>

      {snapshot === null ? (
        <div className="text-base-content/50 text-center py-16">Connecting…</div>
      ) : (
        <div>
          <div className="mb-4">
            <Controls
              onNewNormal={handleNewNormal}
              onNewVip={handleNewVip}
              onAddBot={handleAddBot}
              onDelBot={handleDelBot}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <PendingList orders={snapshot.pending} />
            <BotList
              bots={snapshot.bots}
              processing={snapshot.processing}
              cookDurationMs={snapshot.cookDurationMs}
            />
            <CompleteList orders={snapshot.complete} />
          </div>
        </div>
      )}
    </div>
  );
}
