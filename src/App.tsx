import { ChefHat, Crown, Minus, Plus, Timer, Trophy, UserRound } from "lucide-react";
import { useEffect, useMemo, useReducer } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  createInitialState,
  formatTime,
  orderLabel,
  reducer,
  type Bot,
  type CompletedOrder,
  type Order,
} from "@/order-controller";

function App() {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const processingCount = state.bots.filter((bot) => bot.status === "processing").length;
  const idleCount = state.bots.length - processingCount;
  const newestBotId = state.bots.at(-1)?.id;

  useEffect(() => {
    const timers = state.bots.flatMap((bot) =>
      bot.status === "processing"
        ? [
            window.setTimeout(
              () => dispatch({ type: "complete-order", botId: bot.id, now: Date.now() }),
              Math.max(0, bot.finishAt - Date.now()),
            ),
          ]
        : [],
    );

    return () => timers.forEach(window.clearTimeout);
  }, [state.bots]);

  const stats = useMemo(
    () => [
      {
        label: "Pending orders",
        value: state.pending.length.toString(),
        description: "VIP orders stay ahead of normal orders",
      },
      {
        label: "Processing",
        value: processingCount.toString(),
        description: "Each bot cooks one order for 10 seconds",
      },
      {
        label: "Completed",
        value: state.completed.length.toString(),
        description: "Finished orders move into the complete area",
      },
      {
        label: "Bots online",
        value: state.bots.length.toString(),
        description: `${idleCount} idle / ${processingCount} cooking`,
      },
    ],
    [idleCount, processingCount, state.bots.length, state.completed.length, state.pending.length],
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
        <div className="space-y-4">
          <Badge className="bg-yellow-400 text-yellow-950 hover:bg-yellow-400">
            McDonald's order controller
          </Badge>
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
              Cooking bot control room
            </h1>
            <p className="max-w-3xl text-lg text-muted-foreground">
              Submit normal or VIP orders, scale cooking bots up or down, and watch the in-memory
              queue honor priority rules in real time.
            </p>
          </div>
        </div>

        <Card className="border-yellow-200/80 bg-white/80 backdrop-blur">
          <CardHeader>
            <CardTitle>Controls</CardTitle>
            <CardDescription>
              VIP orders queue behind VIPs and before normal customers.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <Button
              onClick={() => dispatch({ type: "add-order", kind: "normal", now: Date.now() })}
              variant="secondary"
            >
              <UserRound /> New Normal Order
            </Button>
            <Button onClick={() => dispatch({ type: "add-order", kind: "vip", now: Date.now() })}>
              <Crown /> New VIP Order
            </Button>
            <Button
              aria-label="+ Bot"
              onClick={() => dispatch({ type: "add-bot", now: Date.now() })}
              variant="outline"
            >
              <Plus /> Bot
            </Button>
            <Button
              aria-label={newestBotId ? `- Bot #${newestBotId}` : "- Bot"}
              disabled={state.bots.length === 0}
              onClick={() => dispatch({ type: "remove-bot", now: Date.now() })}
              variant="destructive"
            >
              <Minus /> {newestBotId ? `Bot #${newestBotId}` : "Bot"}
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card className="bg-white/80 backdrop-blur" key={stat.label}>
            <CardHeader>
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-3xl">{stat.value}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{stat.description}</CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <QueueCard orders={state.pending} />
        <BotsCard bots={state.bots} />
        <CompleteCard orders={state.completed} />
      </section>

      <Card className="bg-white/80 backdrop-blur">
        <CardHeader>
          <CardTitle>Event log</CardTitle>
          <CardDescription>
            Recent queue and bot transitions with HH:MM:SS timestamps.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {state.events.length > 0 ? (
            <ol className="grid gap-2">
              {state.events.map((event, index) => (
                <li
                  className="rounded-lg border bg-muted/40 px-3 py-2 text-sm"
                  key={`${event}-${index}`}
                >
                  {event}
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState
              icon={<Timer className="size-8" />}
              title="No activity yet"
              description="Create an order or add a bot to start the prototype."
            />
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function QueueCard({ orders }: { orders: Order[] }) {
  return (
    <Card
      aria-label="Pending area"
      className="min-h-[28rem] bg-white/80 backdrop-blur"
      role="region"
    >
      <CardHeader>
        <CardTitle>Pending area</CardTitle>
        <CardDescription>Orders are always displayed in the exact pickup order.</CardDescription>
      </CardHeader>
      <CardContent>
        {orders.length > 0 ? (
          <div className="grid gap-3">
            {orders.map((order, index) => (
              <OrderCard key={order.id} order={order} meta={`Queue position ${index + 1}`} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Timer className="size-8" />}
            title="No pending orders"
            description="Idle bots will wait here for the next order."
          />
        )}
      </CardContent>
    </Card>
  );
}

function BotsCard({ bots }: { bots: Bot[] }) {
  return (
    <Card
      aria-label="Cooking bots"
      className="min-h-[28rem] bg-white/80 backdrop-blur"
      role="region"
    >
      <CardHeader>
        <CardTitle>Cooking bots</CardTitle>
        <CardDescription>Newest bot is removed first when scaling down.</CardDescription>
      </CardHeader>
      <CardContent>
        {bots.length > 0 ? (
          <div className="grid gap-3">
            {bots.map((bot) => (
              <BotCard
                bot={bot}
                key={bot.status === "processing" ? `${bot.id}-${bot.order.id}` : bot.id}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<ChefHat className="size-8" />}
            title="No bots online"
            description="Add a bot to begin processing pending orders."
          />
        )}
      </CardContent>
    </Card>
  );
}

function CompleteCard({ orders }: { orders: CompletedOrder[] }) {
  return (
    <Card
      aria-label="Complete area"
      className="min-h-[28rem] bg-white/80 backdrop-blur"
      role="region"
    >
      <CardHeader>
        <CardTitle>Complete area</CardTitle>
        <CardDescription>Completed orders appear here after a full 10-second cook.</CardDescription>
      </CardHeader>
      <CardContent>
        {orders.length > 0 ? (
          <div className="grid gap-3">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                meta={`Completed at ${formatTime(order.completedAt)}`}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Trophy className="size-8" />}
            title="No completed orders"
            description="Processed orders will move here automatically."
          />
        )}
      </CardContent>
    </Card>
  );
}

function BotCard({ bot }: { bot: Bot }) {
  if (bot.status === "idle") {
    return (
      <div className="rounded-xl border border-dashed bg-muted/30 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold">Bot #{bot.id}</p>
            <p className="text-sm text-muted-foreground">Waiting for a pending order</p>
          </div>
          <Badge variant="secondary">IDLE</Badge>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-gradient-to-br from-yellow-50 to-orange-50 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">Bot #{bot.id}</p>
          <p className="text-sm text-muted-foreground">Cooking {orderLabel(bot.order)}</p>
        </div>
        <Badge className="bg-orange-500 text-white hover:bg-orange-500">PROCESSING</Badge>
      </div>
      <div className="mt-4 space-y-3">
        <OrderCard compact order={bot.order} />
        <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-orange-100">
          <div
            className="h-full origin-left rounded-full bg-orange-500"
            style={{
              animation: `order-progress ${bot.finishAt - bot.startedAt}ms linear forwards`,
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground">Completes at {formatTime(bot.finishAt)}</p>
      </div>
    </div>
  );
}

function OrderCard({
  order,
  meta,
  compact = false,
}: {
  order: Order;
  meta?: string;
  compact?: boolean;
}) {
  const isVip = order.kind === "vip";

  return (
    <article
      className={cn(
        "rounded-xl border p-4 shadow-sm transition-colors",
        compact && "p-3 shadow-none",
        isVip ? "border-yellow-300 bg-yellow-50/90" : "border-slate-200 bg-white/90",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold">{orderLabel(order)}</p>
          <p className="text-sm text-muted-foreground">Created at {formatTime(order.createdAt)}</p>
        </div>
        <Badge
          className={isVip ? "bg-yellow-400 text-yellow-950 hover:bg-yellow-400" : undefined}
          variant={isVip ? "default" : "secondary"}
        >
          {isVip ? "VIP" : "Normal"}
        </Badge>
      </div>
      {meta ? <p className="mt-3 text-sm text-muted-foreground">{meta}</p> : null}
    </article>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="grid min-h-52 place-items-center rounded-xl border border-dashed bg-muted/20 p-6 text-center text-muted-foreground">
      <div className="space-y-3">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-muted">{icon}</div>
        <div>
          <p className="font-medium text-foreground">{title}</p>
          <p className="mt-1 text-sm">{description}</p>
        </div>
      </div>
    </div>
  );
}

export default App;
