import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Bot,
  Clock3,
  Crown,
  History,
  Minus,
  Plus,
  RotateCcw,
  ScrollText,
  ShoppingBag,
  User,
} from "lucide-react";
import {
  ControllerState,
  Order,
  OrderController,
  OrderStatus,
  OrderType,
  formatClock,
  getOrderProgress,
  getRemainingSeconds,
} from "./orderController";

type Language = "zh" | "en";

const copy = {
  zh: {
    assignment: "FeedMe 面试作业",
    title: "厨房公会指挥台",
    mission:
      "派单、召唤机器人、观察 10 秒制作倒计时。VIP 会插到普通单前面，同级别订单保持先到先做。",
    clock: "世界时钟",
    reset: "重置世界",
    language: "语言",
    mapTitle: "像素餐厅地图",
    mapHint: "点击设施执行指令",
    mapAria: "订单和机器人操作地图",
    rulesTitle: "任务规则",
    rules: ["VIP 优先进入等待队列", "机器人空闲时自动接单", "删除制作中的机器人会把订单退回待处理"],
    flowTitle: "通关路线",
    flow: [
      { title: "1 下单", detail: "普通或 VIP 设施生成订单" },
      { title: "2 排队", detail: "VIP 插到普通单前面" },
      { title: "3 制作", detail: "空闲机器人接走下一单" },
      { title: "4 完成", detail: "10 秒倒计时结束入柜台" },
    ],
    legendTitle: "颜色指引",
    legendVip: "金色 + 皇冠 = VIP 贵宾单，优先处理",
    legendNormal: "蓝色 + 购物袋 = 普通单，按顺序处理",
    facilities: {
      normal: { title: "村口柜台", meta: "普通客人下单" },
      vip: { title: "王冠包厢", meta: "VIP 贵宾下单" },
      bot: { title: "机器人作坊", meta: "召唤做餐机器人" },
      remove: { title: "传送出口", meta: "遣散最新机器人" },
    },
    metrics: {
      pending: "待处理",
      processing: "制作中",
      complete: "已完成",
      bots: "活跃机器人",
      completeDetail: (vip: number, normal: number) => `${vip} VIP / ${normal} 普通`,
      idleDetail: (idle: number) => `${idle} 待命`,
    },
    columns: {
      pending: "待处理队列",
      processing: "烹饪战线",
      complete: "完成柜台",
    },
    columnHints: {
      pending: "队列顺序就是下一步接单顺序：VIP 在前，普通单在后。",
      processing: "这里显示机器人正在制作哪一种订单，以及剩余秒数。",
      complete: "完成后的订单会进入这里，最近完成的排在最上面。",
    },
    empty: {
      pending: "暂无待处理订单",
      processing: "暂无制作中订单",
      complete: "暂无完成订单",
      bots: "暂无活跃机器人",
    },
    fleet: "队伍",
    botPanel: "做餐机器人",
    timeline: "时间线",
    eventLog: "冒险日志",
    order: "订单",
    bot: "机器人",
    idle: "待命",
    secondsLeft: (seconds: number) => `剩余 ${seconds} 秒`,
    priorityHint: {
      VIP: "优先级：VIP 会排在普通单前",
      NORMAL: "优先级：普通单按创建顺序等待",
    },
    processingCaption: {
      VIP: "正在制作 VIP 贵宾单",
      NORMAL: "正在制作普通单",
    },
  },
  en: {
    assignment: "FeedMe take-home assignment",
    title: "Kitchen Quest Console",
    mission:
      "Create orders, summon bots, and watch the 10 second cooking countdown. VIP orders jump ahead of normal orders while same-tier orders stay FIFO.",
    clock: "World clock",
    reset: "Reset world",
    language: "Language",
    mapTitle: "Pixel Restaurant Map",
    mapHint: "Click a facility to run a command",
    mapAria: "Order and bot command map",
    rulesTitle: "Quest Rules",
    rules: ["VIP orders enter before normal orders", "Idle bots automatically pick the next order", "Removing a busy bot returns its order to pending"],
    flowTitle: "Run Route",
    flow: [
      { title: "1 Create", detail: "Normal or VIP facilities create orders" },
      { title: "2 Queue", detail: "VIP moves ahead of normal orders" },
      { title: "3 Cook", detail: "Idle bots pick the next order" },
      { title: "4 Complete", detail: "10 second countdown sends it to done" },
    ],
    legendTitle: "Color Guide",
    legendVip: "Gold + crown = VIP order, processed first",
    legendNormal: "Blue + bag = normal order, processed in order",
    facilities: {
      normal: { title: "Village Counter", meta: "New Normal Order" },
      vip: { title: "Crown Booth", meta: "New VIP Order" },
      bot: { title: "Bot Workshop", meta: "Add Cooking Bot" },
      remove: { title: "Warp Exit", meta: "Remove Newest Bot" },
    },
    metrics: {
      pending: "Pending",
      processing: "Processing",
      complete: "Complete",
      bots: "Active Bots",
      completeDetail: (vip: number, normal: number) => `${vip} VIP / ${normal} Normal`,
      idleDetail: (idle: number) => `${idle} idle`,
    },
    columns: {
      pending: "Pending Queue",
      processing: "Cooking Lane",
      complete: "Complete Counter",
    },
    columnHints: {
      pending: "Queue order is the next pickup order: VIP first, normal after.",
      processing: "Shows which order type the bot is cooking and how many seconds remain.",
      complete: "Finished orders land here with the newest completion first.",
    },
    empty: {
      pending: "No pending orders",
      processing: "No orders in process",
      complete: "No completed orders",
      bots: "No active bots",
    },
    fleet: "Fleet",
    botPanel: "Cooking Bots",
    timeline: "Timeline",
    eventLog: "Event Log",
    order: "Order",
    bot: "Bot",
    idle: "Idle",
    secondsLeft: (seconds: number) => `${seconds}s left`,
    priorityHint: {
      VIP: "Priority: VIP jumps ahead of normal orders",
      NORMAL: "Priority: normal orders wait by creation order",
    },
    processingCaption: {
      VIP: "Cooking a VIP order",
      NORMAL: "Cooking a normal order",
    },
  },
} as const;

function App() {
  const controllerRef = useRef(new OrderController());
  const [language, setLanguage] = useState<Language>("zh");
  const [now, setNow] = useState(Date.now());
  const [state, setState] = useState<ControllerState>(() => controllerRef.current.reset(Date.now()));
  const t = copy[language];

  useEffect(() => {
    const timer = window.setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);
      setState(controllerRef.current.tick(currentTime));
    }, 250);

    return () => window.clearInterval(timer);
  }, []);

  const orderById = useMemo(() => new Map(state.orders.map((order) => [order.id, order])), [state.orders]);
  const pendingOrders = state.pendingOrderIds.map((id) => orderById.get(id)).filter(Boolean) as Order[];
  const processingOrders = state.orders
    .filter((order) => order.status === "PROCESSING")
    .sort((a, b) => (a.assignedBotId ?? 0) - (b.assignedBotId ?? 0));
  const completedOrders = state.orders
    .filter((order) => order.status === "COMPLETE")
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));

  const vipCompleted = completedOrders.filter((order) => order.type === "VIP").length;
  const normalCompleted = completedOrders.filter((order) => order.type === "NORMAL").length;
  const idleBots = state.bots.filter((bot) => bot.status === "IDLE").length;

  const sync = (nextState: ControllerState) => {
    setNow(Date.now());
    setState(nextState);
  };

  const reset = () => {
    sync(controllerRef.current.reset(Date.now()));
  };

  return (
    <main className="app-shell">
      <section className="game-header">
        <div className="brand-lockup">
          <span className="logo-token" aria-hidden="true">
            <img src="/mcdonalds.png" alt="" />
          </span>
          <div>
            <p className="eyebrow">{t.assignment}</p>
            <h1>{t.title}</h1>
            <p className="mission-copy">{t.mission}</p>
          </div>
        </div>

        <div className="header-actions">
          <div className="clock" aria-label={t.clock}>
            <Clock3 size={18} />
            {formatClock(now)}
          </div>
          <div className="language-switch" aria-label={t.language}>
            <button className={language === "zh" ? "active" : ""} onClick={() => setLanguage("zh")} aria-pressed={language === "zh"}>
              中文
            </button>
            <button className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")} aria-pressed={language === "en"}>
              EN
            </button>
          </div>
          <button className="reset-command" onClick={reset} aria-label={t.reset} title={t.reset}>
            <RotateCcw size={18} />
            <span>{t.reset}</span>
          </button>
        </div>
      </section>

      <section className="command-map" aria-label={t.mapAria}>
        <div className="map-heading">
          <div>
            <p className="eyebrow">{t.rulesTitle}</p>
            <h2>{t.mapTitle}</h2>
          </div>
          <span>{t.mapHint}</span>
        </div>

        <div className="facility-grid">
          <FacilityButton
            tone="normal"
            icon={<User size={22} />}
            title={t.facilities.normal.title}
            meta={t.facilities.normal.meta}
            value={`#${state.orders.length + 1001}`}
            onClick={() => sync(controllerRef.current.createOrder("NORMAL", Date.now()))}
          />
          <FacilityButton
            tone="vip"
            icon={<Crown size={22} />}
            title={t.facilities.vip.title}
            meta={t.facilities.vip.meta}
            value="VIP"
            onClick={() => sync(controllerRef.current.createOrder("VIP", Date.now()))}
          />
          <FacilityButton
            tone="bot"
            icon={<Plus size={22} />}
            title={t.facilities.bot.title}
            meta={t.facilities.bot.meta}
            value={`x${state.bots.length}`}
            onClick={() => sync(controllerRef.current.addBot(Date.now()))}
          />
          <FacilityButton
            tone="remove"
            icon={<Minus size={22} />}
            title={t.facilities.remove.title}
            meta={t.facilities.remove.meta}
            value={state.bots.length > 0 ? `#${state.bots.at(-1)?.id}` : "0"}
            onClick={() => sync(controllerRef.current.removeNewestBot(Date.now()))}
          />
        </div>

        <ul className="rule-strip">
          {t.rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </section>

      <section className="flow-guide" aria-label={t.flowTitle}>
        <div className="flow-heading">
          <p className="eyebrow">{t.flowTitle}</p>
          <div className="type-legend">
            <span className="type-chip vip">{formatOrderTypeLabel("VIP", language)}</span>
            <span>{t.legendVip}</span>
            <span className="type-chip normal">{formatOrderTypeLabel("NORMAL", language)}</span>
            <span>{t.legendNormal}</span>
          </div>
        </div>
        <ol className="flow-steps">
          {t.flow.map((step) => (
            <li key={step.title}>
              <strong>{step.title}</strong>
              <span>{step.detail}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="stats-grid" aria-label="System summary">
        <Metric label={t.metrics.pending} value={pendingOrders.length} tone="normal" />
        <Metric label={t.metrics.processing} value={processingOrders.length} tone="vip" />
        <Metric label={t.metrics.complete} value={completedOrders.length} detail={t.metrics.completeDetail(vipCompleted, normalCompleted)} tone="complete" />
        <Metric label={t.metrics.bots} value={state.bots.length} detail={t.metrics.idleDetail(idleBots)} tone="bot" />
      </section>

      <section className="workspace">
        <BoardColumn title={t.columns.pending} count={pendingOrders.length} hint={t.columnHints.pending}>
          {pendingOrders.length === 0 ? (
            <EmptyState label={t.empty.pending} />
          ) : (
            pendingOrders.map((order) => <OrderRow key={order.id} order={order} language={language} label={t.order} priorityHint={t.priorityHint[order.type]} />)
          )}
        </BoardColumn>

        <BoardColumn title={t.columns.processing} count={processingOrders.length} hint={t.columnHints.processing}>
          {processingOrders.length === 0 ? (
            <EmptyState label={t.empty.processing} />
          ) : (
            processingOrders.map((order) => (
              <ProcessingRow
                key={order.id}
                order={order}
                now={now}
                language={language}
                labels={{ order: t.order, bot: t.bot, secondsLeft: t.secondsLeft, caption: t.processingCaption[order.type] }}
              />
            ))
          )}
        </BoardColumn>

        <BoardColumn title={t.columns.complete} count={completedOrders.length} hint={t.columnHints.complete}>
          {completedOrders.length === 0 ? (
            <EmptyState label={t.empty.complete} />
          ) : (
            completedOrders.map((order) => (
              <OrderRow key={order.id} order={order} timestamp={order.completedAt} language={language} label={t.order} priorityHint={t.priorityHint[order.type]} />
            ))
          )}
        </BoardColumn>
      </section>

      <section className="lower-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">{t.fleet}</p>
              <h2>{t.botPanel}</h2>
            </div>
            <Bot size={22} />
          </div>
          <div className="bot-list">
            {state.bots.length === 0 ? (
              <EmptyState label={t.empty.bots} />
            ) : (
              state.bots.map((bot) => {
                const order = bot.currentOrderId ? orderById.get(bot.currentOrderId) : undefined;
                return (
                  <div className="bot-row" key={bot.id}>
                    <div>
                      <strong>{t.bot} #{bot.id}</strong>
                      {order ? <span className={`type-chip ${order.type.toLowerCase()}`}>{formatOrderTypeLabel(order.type, language)}</span> : null}
                      <span>{bot.status === "IDLE" ? t.idle : `${t.order} #${bot.currentOrderId}`}</span>
                    </div>
                    <StatusBadge status={bot.status} language={language} />
                    {order ? <ProgressBar value={getOrderProgress(order, now)} /> : null}
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">{t.timeline}</p>
              <h2>{t.eventLog}</h2>
            </div>
            <History size={22} />
          </div>
          <ol className="log-list">
            {state.logs.map((log) => (
              <li key={log.id}>
                <time>{formatClock(log.at)}</time>
                <span>{formatLogMessage(log.message, language)}</span>
              </li>
            ))}
          </ol>
        </section>
      </section>
    </main>
  );
}

function FacilityButton({
  tone,
  icon,
  title,
  meta,
  value,
  onClick,
}: {
  tone: string;
  icon: ReactNode;
  title: string;
  meta: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button className={`facility-tile ${tone}`} onClick={onClick}>
      <span className="facility-icon">{icon}</span>
      <span>
        <strong>{title}</strong>
        <small>{meta}</small>
      </span>
      <em>{value}</em>
    </button>
  );
}

function Metric({ label, value, detail, tone }: { label: string; value: number; detail?: string; tone: string }) {
  return (
    <div className={`metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}

function BoardColumn({ title, count, hint, children }: { title: string; count: number; hint: string; children: ReactNode }) {
  return (
    <section className="column">
      <header>
        <div>
          <h2>{title}</h2>
          <p>{hint}</p>
        </div>
        <span>{count}</span>
      </header>
      <div className="column-body">{children}</div>
    </section>
  );
}

function OrderRow({
  order,
  timestamp,
  language,
  label,
  priorityHint,
}: {
  order: Order;
  timestamp?: number;
  language: Language;
  label: string;
  priorityHint: string;
}) {
  return (
    <article className={`order-row ${order.type.toLowerCase()}`}>
      <div className="order-main">
        <span className="order-icon">{order.type === "VIP" ? <Crown size={17} /> : <ShoppingBag size={17} />}</span>
        <div className="order-copy">
          <span className={`type-chip ${order.type.toLowerCase()}`}>{formatOrderTypeLabel(order.type, language)}</span>
          <strong>
            {label} #{order.id}
          </strong>
          <span>{priorityHint}</span>
        </div>
      </div>
      {timestamp ? <time>{formatClock(timestamp)}</time> : <StatusBadge status={order.status} language={language} />}
    </article>
  );
}

function ProcessingRow({
  order,
  now,
  language,
  labels,
}: {
  order: Order;
  now: number;
  language: Language;
  labels: { order: string; bot: string; secondsLeft: (seconds: number) => string; caption: string };
}) {
  const remainingSeconds = getRemainingSeconds(order, now);

  return (
    <article className={`order-row processing ${order.type.toLowerCase()}`}>
      <div className="order-main">
        <span className="order-icon">
          {order.type === "VIP" ? <Crown size={17} /> : <ShoppingBag size={17} />}
        </span>
        <div className="order-copy">
          <span className={`type-chip ${order.type.toLowerCase()}`}>{formatOrderTypeLabel(order.type, language)}</span>
          <strong>
            {labels.order} #{order.id}
          </strong>
          <span>
            {labels.bot} #{order.assignedBotId} · {labels.secondsLeft(remainingSeconds)}
          </span>
        </div>
      </div>
      <div className="processing-side">
        <span>{labels.caption}</span>
        <StatusBadge status={order.status} language={language} />
      </div>
      <ProgressBar value={getOrderProgress(order, now)} />
    </article>
  );
}

function StatusBadge({ status, language }: { status: OrderStatus | "IDLE" | "PROCESSING"; language: Language }) {
  return <span className={`status-pill ${status.toLowerCase()}`}>{formatStatus(status, language)}</span>;
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="progress" aria-hidden="true">
      <span style={{ width: `${value}%` }} />
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <p className="empty-state">
      <ScrollText size={16} />
      {label}
    </p>
  );
}

function formatOrderTypeLabel(type: OrderType | string, language: Language): string {
  if (language === "en") {
    return type === "VIP" ? "VIP" : "Normal";
  }

  return type === "VIP" ? "VIP 贵宾单" : "普通单";
}

function formatStatus(status: string, language: Language): string {
  if (language === "en") {
    return status;
  }

  const statusLabels: Record<string, string> = {
    PENDING: "待处理",
    PROCESSING: "制作中",
    COMPLETE: "已完成",
    IDLE: "待命",
  };

  return statusLabels[status] ?? status;
}

function formatLogMessage(message: string, language: Language): string {
  if (language === "en") {
    return message;
  }

  let match = message.match(/^Created (VIP|Normal) Order #(\d+) - Status: PENDING$/);
  if (match) {
    return `创建${formatOrderTypeLabel(match[1], language)} #${match[2]} - 状态：待处理`;
  }

  match = message.match(/^Bot #(\d+) created - Status: IDLE$/);
  if (match) {
    return `机器人 #${match[1]} 已部署 - 状态：待命`;
  }

  match = message.match(/^Bot #(\d+) picked up (VIP|Normal) Order #(\d+) - Status: PROCESSING$/);
  if (match) {
    return `机器人 #${match[1]} 接取${formatOrderTypeLabel(match[2], language)} #${match[3]} - 状态：制作中`;
  }

  match = message.match(/^Bot #(\d+) completed (VIP|Normal) Order #(\d+) - Status: COMPLETE$/);
  if (match) {
    return `机器人 #${match[1]} 完成${formatOrderTypeLabel(match[2], language)} #${match[3]} - 状态：已完成`;
  }

  match = message.match(/^Bot #(\d+) destroyed while processing (VIP|Normal) Order #(\d+); order returned to PENDING$/);
  if (match) {
    return `机器人 #${match[1]} 在制作${formatOrderTypeLabel(match[2], language)} #${match[3]} 时被遣散；订单退回待处理`;
  }

  match = message.match(/^Bot #(\d+) destroyed while IDLE$/);
  if (match) {
    return `机器人 #${match[1]} 待命时被遣散`;
  }

  if (message === "No bot available to destroy") {
    return "没有可遣散的机器人";
  }

  if (message === "System reset with 0 bots and 0 orders") {
    return "世界已重置：0 个机器人，0 张订单";
  }

  return message;
}

export default App;
