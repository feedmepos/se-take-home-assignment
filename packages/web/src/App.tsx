import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_PROCESS_DURATION_MS,
  type DomainEvent,
  type SystemSnapshot,
} from "@feedme/core";

import {
  addBot,
  createEventSource,
  getState,
  postOrder,
  removeLatestBot,
} from "./lib/api";
import {
  DetailDialog,
  ErrorNotice,
  ProcessingProgress,
  StatusColumn,
  TimelineDialog,
  type SelectedEntity,
} from "./components";
import { formatTime } from "./lib/format";

interface ClockSync {
  receivedAt: number;
  serverTime: number;
}

export function App() {
  const [snapshot, setSnapshot] = useState<SystemSnapshot | null>(null);
  const [clockSync, setClockSync] = useState<ClockSync | null>(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [connectionState, setConnectionState] = useState<
    "loading" | "connected" | "reconnecting" | "error"
  >("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<SelectedEntity>(null);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<DomainEvent[]>([]);

  const receiveSnapshot = useCallback((nextSnapshot: SystemSnapshot) => {
    const receivedAt = Date.now();
    setSnapshot(nextSnapshot);
    setClockSync({ receivedAt, serverTime: nextSnapshot.serverTime });
    setCurrentTime(nextSnapshot.serverTime);
    setErrorMessage(null);
  }, []);

  useEffect(() => {
    let disposed = false;
    let eventSource: EventSource | undefined;
    let reconnectTimer: number | undefined;

    const clearReconnectTimer = () => {
      if (reconnectTimer !== undefined) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = undefined;
      }
    };

    const scheduleReconnect = () => {
      if (disposed || reconnectTimer !== undefined) {
        return;
      }
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = undefined;
        void connect();
      }, 1500);
    };

    const connect = async () => {
      try {
        clearReconnectTimer();
        const nextSnapshot = await getState();
        if (disposed) {
          return;
        }
        receiveSnapshot(nextSnapshot);
        setConnectionState("connected");
        eventSource?.close();
        const nextEventSource = createEventSource((event: DomainEvent) => {
          if (disposed) {
            return;
          }
          if (event.id !== 0) {
            setTimeline((current) =>
              [event, ...current.filter((item) => item.id !== event.id)].slice(
                0,
                20,
              ),
            );
          }
          receiveSnapshot(event.snapshot);
          setConnectionState("connected");
        });
        eventSource = nextEventSource;
        nextEventSource.onerror = () => {
          if (disposed) {
            return;
          }
          setConnectionState("reconnecting");
          nextEventSource.close();
          if (eventSource === nextEventSource) {
            eventSource = undefined;
          }
          scheduleReconnect();
        };
      } catch (error) {
        if (disposed) {
          return;
        }
        setConnectionState("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load state.",
        );
        scheduleReconnect();
      }
    };

    void connect();

    return () => {
      disposed = true;
      clearReconnectTimer();
      eventSource?.close();
    };
  }, [receiveSnapshot]);

  useEffect(() => {
    if (!clockSync || (snapshot?.processingOrders.length ?? 0) === 0) {
      return;
    }

    const updateCurrentTime = () => {
      setCurrentTime(clockSync.serverTime + Date.now() - clockSync.receivedAt);
    };

    updateCurrentTime();
    const timer = window.setInterval(updateCurrentTime, 250);
    return () => {
      window.clearInterval(timer);
    };
  }, [clockSync, snapshot?.processingOrders.length]);

  useEffect(() => {
    if (!selected && !timelineOpen) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelected(null);
        setTimelineOpen(false);
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [selected, timelineOpen]);

  const runAction = async (
    actionKey: string,
    action: () => Promise<SystemSnapshot>,
  ) => {
    setSubmitting(actionKey);
    setErrorMessage(null);
    try {
      const nextSnapshot = await action();
      receiveSnapshot(nextSnapshot);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Action failed.",
      );
    } finally {
      setSubmitting(null);
    }
  };

  const metrics = snapshot?.metrics;
  const processDurationMs =
    snapshot?.processDurationMs ?? DEFAULT_PROCESS_DURATION_MS;

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero-brand">
          <div className="hero-title-row">
            <span className="hero-mark" aria-hidden="true">
              🍔
            </span>
            <h1>
              <span className="hero-accent">FeedMe</span> Order Controller
            </h1>
            <div className={`connection-pill ${connectionState}`}>
              {connectionState}
            </div>
          </div>
        </div>
        <div className="hero-actions" aria-label="Kitchen controls">
          <div className="button-row hero-action-group">
            <button
              disabled={submitting !== null}
              onClick={() =>
                void runAction("normal", () => postOrder("normal"))
              }
            >
              {submitting === "normal" ? "Adding..." : "New Normal Order"}
            </button>
            <button
              className="accent"
              disabled={submitting !== null}
              onClick={() => void runAction("vip", () => postOrder("vip"))}
            >
              {submitting === "vip" ? "Adding..." : "New VIP Order"}
            </button>
          </div>
          <div className="button-row hero-action-group">
            <button
              disabled={submitting !== null}
              onClick={() => void runAction("add-bot", addBot)}
            >
              {submitting === "add-bot" ? "Adding..." : "+ Bot"}
            </button>
            <button
              className="secondary"
              disabled={submitting !== null}
              onClick={() => void runAction("remove-bot", removeLatestBot)}
            >
              {submitting === "remove-bot" ? "Removing..." : "- Bot"}
            </button>
          </div>
          <div className="hero-action-group timeline-launch">
            <button
              className="timeline-open-button"
              onClick={() => setTimelineOpen(true)}
              type="button"
            >
              Timeline
              <span>{timeline.length}</span>
            </button>
          </div>
        </div>
      </section>

      {errorMessage ? (
        <ErrorNotice
          message={errorMessage}
          onDismiss={() => setErrorMessage(null)}
        />
      ) : null}

      <section className="workspace">
        <StatusColumn
          title="Bots"
          subtitle="Execution capacity"
          detail={`Idle ${metrics?.idleBotCount ?? 0}`}
          items={snapshot?.bots ?? []}
          emptyMessage="No bots available. Add a bot to start processing orders."
          onSelect={(value) => setSelected({ kind: "bot", value })}
          renderItem={(bot) => (
            <>
              <div className="card-title-row">
                <div className="card-title">Bot #{bot.id}</div>
                <div className="card-meta">{bot.status.toUpperCase()}</div>
              </div>
              <div className="card-line">
                Current order:{" "}
                {bot.currentOrderId ? `#${bot.currentOrderId}` : "Idle"}
              </div>
              <div className="card-line">Completed: {bot.completedOrders}</div>
            </>
          )}
        />
        <StatusColumn
          title="Pending"
          subtitle="VIP orders stay ahead of normal orders"
          detail={`VIP ${metrics?.vipPendingCount ?? 0} / Normal ${metrics?.normalPendingCount ?? 0}`}
          items={snapshot?.pendingOrders ?? []}
          emptyMessage="No pending orders."
          onSelect={(value) => setSelected({ kind: "order", value })}
          renderItem={(order) => (
            <>
              <div className="card-title-row">
                <div className="card-title">Order #{order.id}</div>
                <div className={`tag ${order.priority}`}>
                  {order.priority.toUpperCase()}
                </div>
              </div>
              <div className="card-line">
                Queued at {formatTime(order.createdAt)}
              </div>
            </>
          )}
        />
        <StatusColumn
          title="Processing"
          subtitle="Orders currently assigned to bots"
          detail="Orders in motion"
          items={snapshot?.processingOrders ?? []}
          emptyMessage="Waiting for bots to pick up orders."
          onSelect={(value) => setSelected({ kind: "order", value })}
          renderItem={(order) => (
            <>
              <div className="card-title-row">
                <div className="card-title">Order #{order.id}</div>
                <div className={`tag ${order.priority}`}>
                  {order.priority.toUpperCase()}
                </div>
              </div>
              <div className="card-line">
                Assigned bot: #{order.assignedBotId}
              </div>
              <div className="card-line">
                Started at {formatTime(order.processingStartedAt)}
              </div>
              <ProcessingProgress
                currentTime={currentTime}
                order={order}
                processDurationMs={processDurationMs}
              />
            </>
          )}
        />
        <StatusColumn
          title="Complete"
          subtitle="Recently completed orders"
          detail={`VIP ${metrics?.vipCompletedCount ?? 0} / Normal ${metrics?.normalCompletedCount ?? 0}`}
          items={snapshot?.completedOrders ?? []}
          emptyMessage="Completed orders will appear here."
          onSelect={(value) => setSelected({ kind: "order", value })}
          renderItem={(order) => (
            <>
              <div className="card-title-row">
                <div className="card-title">Order #{order.id}</div>
                <div className={`tag ${order.priority}`}>
                  {order.priority.toUpperCase()}
                </div>
              </div>
              <div className="card-line">
                Processed by Bot #{order.assignedBotId}
              </div>
              <div className="card-line">
                Completed at {formatTime(order.completedAt)}
              </div>
            </>
          )}
        />
      </section>

      {selected ? (
        <DetailDialog
          currentTime={currentTime}
          onClose={() => setSelected(null)}
          processDurationMs={processDurationMs}
          selected={selected}
        />
      ) : null}
      {timelineOpen ? (
        <TimelineDialog
          events={timeline}
          onClose={() => setTimelineOpen(false)}
        />
      ) : null}
    </main>
  );
}
