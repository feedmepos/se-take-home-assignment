import { useCallback, useEffect, useState } from "react";

type Order = {
  id: number;
  tier: string;
  status: string;
  assigned_bot_id?: number;
  created_at?: string;
  started_at?: string;
  completed_at?: string;
};

type Bot = { id: number; state: string };

type Snapshot = {
  pending: Order[];
  processing: Order[];
  complete: Order[];
  exception: Order[];
  bots: Bot[];
};

/** 开发环境走 Vite proxy（/api）；生产子路径走 BASE_URL（如 /feedme/） */
function apiUrl(path: string): string {
  if (import.meta.env.DEV) {
    return path.startsWith("/") ? path : `/${path}`;
  }
  const b = (import.meta.env.BASE_URL || "/").replace(/\/?$/, "/");
  const tail = path.startsWith("/") ? path.slice(1) : path;
  return b + tail;
}

const api = (path: string, init?: RequestInit) =>
  fetch(apiUrl(path), { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });

export default function App() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const r = await api("/api/v1/orders/snapshot");
      if (!r.ok) throw new Error(String(r.status));
      setSnap(await r.json());
      setErr(null);
    } catch (e) {
      setErr(String(e));
    }
  }, []);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 800);
    return () => clearInterval(t);
  }, [refresh]);

  const newOrder = async (tier: "normal" | "vip") => {
    await api("/api/v1/orders", { method: "POST", body: JSON.stringify({ tier }) });
    await refresh();
  };

  const addBot = async () => {
    await api("/api/v1/bots", { method: "POST" });
    await refresh();
  };

  const removeBot = async () => {
    await api("/api/v1/bots/latest", { method: "DELETE" });
    await refresh();
  };

  const retry = async (id: number) => {
    await api(`/api/v1/orders/${id}/retry`, { method: "POST" });
    await refresh();
  };

  return (
    <div style={{ fontFamily: "system-ui", maxWidth: 960, margin: "0 auto", padding: 16 }}>
      <h1>FeedMe 订单控制台1</h1>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <button type="button" onClick={() => void newOrder("normal")}>
          New Normal Order
        </button>
        <button type="button" onClick={() => void newOrder("vip")}>
          New VIP Order
        </button>
        <button type="button" onClick={() => void addBot()}>
          + Bot
        </button>
        <button type="button" onClick={() => void removeBot()}>
          - Bot
        </button>
        <button type="button" onClick={() => void refresh()}>
          刷新
        </button>
      </div>
      {err && <p style={{ color: "crimson" }}>{err}</p>}
      {!snap && !err && <p>加载中…</p>}
      {snap && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Section title="PENDING" orders={snap.pending} />
          <Section title="PROCESSING" orders={snap.processing} showStartedAt />
          <Section title="COMPLETE" orders={snap.complete} showCompletedAt />
          <Section
            title="EXCEPTION"
            orders={snap.exception}
            onRetry={retry}
          />
          <div style={{ gridColumn: "1 / -1" }}>
            <h3>Bots</h3>
            <ul>
              {snap.bots.map((b) => (
                <li key={b.id}>
                  #{b.id} — {b.state}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function formatLocal(ts: string | undefined) {
  if (!ts) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString();
}

function Section({
  title,
  orders,
  onRetry,
  showCompletedAt,
  showStartedAt,
}: {
  title: string;
  orders: Order[];
  onRetry?: (id: number) => void;
  showCompletedAt?: boolean;
  showStartedAt?: boolean;
}) {
  return (
    <div style={{ border: "1px solid #ccc", borderRadius: 8, padding: 12 }}>
      <h3>{title}</h3>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {orders.map((o) => (
          <li key={o.id} style={{ marginBottom: 6 }}>
            <strong>#{o.id}</strong> {o.tier} / {o.status}
            {o.assigned_bot_id != null && ` bot=${o.assigned_bot_id}`}
            {showStartedAt && o.started_at && (
              <span style={{ color: "#555", marginLeft: 6 }}>
                开始 {formatLocal(o.started_at)}
              </span>
            )}
            {showCompletedAt && o.completed_at && (
              <span style={{ color: "#555", marginLeft: 6 }}>
                完成 {formatLocal(o.completed_at)}
              </span>
            )}
            {title === "EXCEPTION" && onRetry && (
              <button type="button" style={{ marginLeft: 8 }} onClick={() => void onRetry(o.id)}>
                Retry
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
