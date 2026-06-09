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

  const dotClass =
    status === 'connected'
      ? 'bg-success'
      : status === 'reconnecting'
      ? 'bg-warning'
      : 'bg-gray-300';

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
    <div className="flex flex-col h-screen bg-base-200">
      {/* Brand header */}
      <header className="bg-primary text-primary-content px-4 py-3 flex items-center gap-3 shadow-md shrink-0">
        <img src={archesUrl} alt="McDonald's golden arches" className="h-7 w-9 shrink-0 object-contain" />
        <h1 className="text-xl font-bold tracking-tight">McDonald's Order Controller</h1>
        <span className="ml-auto flex items-center gap-2 text-sm font-medium text-white">
          <span
            className={`inline-block h-2 w-2 rounded-full ${dotClass}`}
            aria-hidden="true"
          />
          {indicatorLabel}
        </span>
      </header>

      {snapshot === null ? (
        <div className="text-base-content/50 text-center py-16">Connecting…</div>
      ) : (
        <div className="flex flex-col flex-1 min-h-0 p-4 gap-4">
          {/* Controls bar */}
          <div className="bg-base-100 rounded-box shadow-sm p-3 shrink-0">
            <Controls
              onNewNormal={handleNewNormal}
              onNewVip={handleNewVip}
              onAddBot={handleAddBot}
              onDelBot={handleDelBot}
            />
          </div>

          {/* Three-column grid — fills remaining height */}
          <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-4">
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
