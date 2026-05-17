"use client";

import type { ReactElement, ReactNode } from "react";
import { useKitchen } from "@/kitchen/useKitchen";
import type { Order } from "@/kitchen/types";

function OrderChip({ order }: { order: Order }): ReactElement {
  const vip = order.type === "VIP";
  return (
    <span
      className={
        vip
          ? "rounded-md border border-amber-400/60 bg-amber-500/15 px-2 py-1 text-amber-100"
          : "rounded-md border border-stone-600 bg-stone-900/60 px-2 py-1 text-stone-200"
      }
    >
      #{order.id} · {order.type}
    </span>
  );
}

export default function HomePage(): ReactElement {
  const { snapshot, model } = useKitchen();
  const raw = process.env.NEXT_PUBLIC_ORDER_PROCESS_MS;
  const processHint =
    typeof raw === "string" && raw.trim() !== "" ? `${raw}ms (dev)` : "10s (default)";

  return (
    <div className="min-h-dvh bg-gradient-to-b from-stone-950 via-stone-950 to-stone-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10">
        <header className="flex flex-col gap-2 border-b border-stone-800 pb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-400/90">
            Take-home prototype
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Automated kitchen order controller
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-stone-400">
            VIP orders queue ahead of normal orders (FIFO within each tier). Each bot handles one
            order at a time. Cook duration: <span className="text-stone-200">{processHint}</span>.
            Set{" "}
            <code className="rounded bg-stone-900 px-1 py-0.5 text-stone-200">
              NEXT_PUBLIC_ORDER_PROCESS_MS
            </code>{" "}
            in <code className="rounded bg-stone-900 px-1 py-0.5 text-stone-200">web/.env.local</code>{" "}
            for faster local demos.
          </p>
        </header>

        <section className="flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-lg bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-900 shadow hover:bg-white"
            onClick={() => model.addNormalOrder()}
          >
            New Normal Order
          </button>
          <button
            type="button"
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-stone-950 shadow hover:bg-amber-400"
            onClick={() => model.addVIPOrder()}
          >
            New VIP Order
          </button>
          <button
            type="button"
            className="rounded-lg border border-emerald-700/70 bg-emerald-950/40 px-4 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-900/50"
            onClick={() => model.addBot()}
          >
            + Bot
          </button>
          <button
            type="button"
            className="rounded-lg border border-rose-800/70 bg-rose-950/30 px-4 py-2 text-sm font-semibold text-rose-100 hover:bg-rose-900/40"
            onClick={() => model.removeNewestBot()}
          >
            − Bot
          </button>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          <Panel title="PENDING" subtitle="VIP first, then normal (each FIFO)">
            <div className="flex flex-col gap-3">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
                  VIP lane
                </p>
                <div className="flex min-h-[44px] flex-wrap gap-2">
                  {snapshot.vip.length === 0 ? (
                    <EmptyChip />
                  ) : (
                    snapshot.vip.map((o) => <OrderChip key={o.id} order={o} />)
                  )}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Normal lane
                </p>
                <div className="flex min-h-[44px] flex-wrap gap-2">
                  {snapshot.normal.length === 0 ? (
                    <EmptyChip />
                  ) : (
                    snapshot.normal.map((o) => <OrderChip key={o.id} order={o} />)
                  )}
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="BOTS" subtitle="Newest bot has highest id; − Bot removes newest">
            <div className="flex flex-col gap-3">
              {snapshot.bots.length === 0 ? (
                <p className="text-sm text-stone-500">No bots yet. Press “+ Bot”.</p>
              ) : (
                snapshot.bots.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-lg border border-stone-800 bg-stone-950/40 p-3 text-sm text-stone-200"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-white">Bot #{b.id}</span>
                      <span
                        className={
                          b.status === "PROCESSING"
                            ? "rounded-full bg-sky-500/20 px-2 py-0.5 text-xs font-semibold text-sky-200"
                            : "rounded-full bg-stone-800 px-2 py-0.5 text-xs font-semibold text-stone-300"
                        }
                      >
                        {b.status}
                      </span>
                    </div>
                    {b.status === "PROCESSING" && b.cook ? (
                      <p className="mt-2 text-xs text-stone-400">
                        Cooking <OrderChip order={b.cook.order} />
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-stone-500">Waiting for pending orders…</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </Panel>

          <Panel title="COMPLETE" subtitle="Finished orders (in completion order)">
            <div className="flex min-h-[44px] flex-wrap gap-2">
              {snapshot.completed.length === 0 ? (
                <EmptyChip label="No completed orders" />
              ) : (
                snapshot.completed.map((o) => <OrderChip key={o.id} order={o} />)
              )}
            </div>
          </Panel>
        </div>

        <footer className="border-t border-stone-800 pt-6 text-xs text-stone-500">
          In-memory only. Deploy with Next.js (e.g. Vercel) or use static export output{" "}
          <span className="text-stone-300">web/out</span>. See <span className="text-stone-300">web/README.md</span>.
        </footer>
      </div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}): ReactElement {
  return (
    <section className="rounded-xl border border-stone-800 bg-stone-950/40 p-4 shadow-lg shadow-black/30">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="text-xs text-stone-500">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function EmptyChip({ label = "Empty" }: { label?: string }): ReactElement {
  return (
    <span className="rounded-md border border-dashed border-stone-800 px-2 py-1 text-xs text-stone-500">
      {label}
    </span>
  );
}
