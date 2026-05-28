import { useEventSource, type EventSourceLike } from './hooks/useEventSource';
import { newOrder, addBot, delBot } from './api/client';
import { Controls } from './components/Controls';
import { PendingList } from './components/PendingList';
import { BotList } from './components/BotList';
import { CompleteList } from './components/CompleteList';
import archesUrl from './assets/arches.svg';

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
    <div className="min-h-screen bg-base-200">
      {/* Brand header */}
      <header className="bg-primary text-primary-content px-4 py-3 flex items-center gap-3 shadow-md">
        <img src={archesUrl} alt="McDonald's golden arches" className="h-8 w-8 shrink-0" />
        <h1 className="text-xl font-bold tracking-tight">McDonald's Order Controller</h1>
        <span className={`${indicatorClass} ml-auto`}>{indicatorLabel}</span>
      </header>

      {snapshot === null ? (
        <div className="text-base-content/50 text-center py-16">Connecting…</div>
      ) : (
        <div className="p-4 flex flex-col gap-4">
          {/* Controls bar */}
          <div className="bg-base-100 rounded-box shadow-sm p-3">
            <Controls
              onNewNormal={handleNewNormal}
              onNewVip={handleNewVip}
              onAddBot={handleAddBot}
              onDelBot={handleDelBot}
            />
          </div>

          {/* Three-column grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
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
