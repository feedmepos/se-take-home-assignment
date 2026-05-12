import { useOrderController } from "./hooks/useOrderController";

export default function App() {
	const { state, stats, addNormalOrder, addVipOrder, addBot, removeBot } =
		useOrderController();

	return (
		<main className="min-h-screen bg-grid-pattern px-4 py-8 text-slate-900">
			<div className="mx-auto max-w-6xl">
				<header className="mb-8 rounded-3xl border border-slate-900 bg-cream p-6 shadow-hard">
					<p className="font-display text-5xl leading-none text-slate-950 md:text-7xl">
						McDonald&apos;s Order Management Simulation
					</p>
					<p className="mt-3 max-w-2xl text-sm md:text-base">
						Queue simulation for McDonald&apos;s orders. VIP orders jump ahead
						of normal orders, bots process one order at a time, and scaling bots
						up or down updates processing immediately.
					</p>

					<div className="mt-6 flex flex-wrap gap-3">
						<button
							type="button"
							className="btn btn-normal"
							onClick={addNormalOrder}
						>
							New Normal Order
						</button>
						<button type="button" className="btn btn-vip" onClick={addVipOrder}>
							New VIP Order
						</button>
						<button type="button" className="btn btn-bot" onClick={addBot}>
							+ Bot
						</button>
						<button type="button" className="btn btn-bot" onClick={removeBot}>
							- Bot
						</button>
					</div>
				</header>

				<section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-6">
					<StatCard label="Bots" value={stats.totalBots} tone="slate" />
					<StatCard label="Idle" value={stats.idle} tone="green" />
					<StatCard label="Processing" value={stats.processing} tone="red" />
					<StatCard label="Pending" value={stats.pending} tone="slate" />
					<StatCard label="VIP Pending" value={stats.vipPending} tone="amber" />
					<StatCard label="Completed" value={stats.complete} tone="blue" />
				</section>

				<section className="grid gap-5 md:grid-cols-3">
					<Panel title="Bots">
						{state.bots.length === 0 ? (
							<EmptyMessage text="No bots yet. Click + Bot to start processing." />
						) : (
							<div className="space-y-3">
								{state.bots.map((bot) => (
									<div key={bot.id} className="bot-card">
										<div className="flex items-center justify-between">
											<p className="font-display text-2xl leading-none">
												BOT {bot.id}
											</p>
											<span
												className={`rounded-full border px-2 py-1 text-[10px] font-semibold tracking-wider ${
													bot.status === "IDLE"
														? "border-green-700/60 bg-green-100 text-green-800"
														: "border-red-700/60 bg-red-100 text-red-800"
												}`}
											>
												{bot.status}
											</span>
										</div>
										{bot.order ? (
											<p className="mt-2 text-sm">
												Processing order #{bot.order.id} ({bot.order.type})
											</p>
										) : (
											<p className="mt-2 text-sm opacity-70">
												Waiting for new order
											</p>
										)}
									</div>
								))}
							</div>
						)}
					</Panel>

					<Panel title="Pending">
						{state.pending.length === 0 ? (
							<EmptyMessage text="No pending orders." />
						) : (
							<div className="grid gap-2">
								{state.pending.map((order) => (
									<OrderPill key={order.id} order={order} />
								))}
							</div>
						)}
					</Panel>

					<Panel title="Complete">
						{state.complete.length === 0 ? (
							<EmptyMessage text="Completed orders appear here." />
						) : (
							<div className="grid gap-2">
								{state.complete.map((order) => (
									<OrderPill key={order.id} order={order} />
								))}
							</div>
						)}
					</Panel>
				</section>
			</div>
		</main>
	);
}

function Panel({ title, children }) {
	return (
		<div className="rounded-2xl border border-slate-900 bg-white/80 p-4 shadow-hard backdrop-blur-sm">
			<h2 className="font-display text-3xl leading-none text-slate-950">
				{title}
			</h2>
			<div className="mt-4">{children}</div>
		</div>
	);
}

function StatCard({ label, value, tone }) {
	const toneClass = {
		slate: "border-slate-800 bg-slate-100",
		green: "border-green-700 bg-green-100",
		red: "border-red-700 bg-red-100",
		amber: "border-amber-700 bg-amber-100",
		blue: "border-blue-700 bg-blue-100",
	}[tone];

	return (
		<div className={`rounded-xl border p-3 shadow-hard-sm ${toneClass}`}>
			<p className="text-xs font-semibold tracking-widest">
				{label.toUpperCase()}
			</p>
			<p className="mt-1 font-display text-4xl leading-none">{value}</p>
		</div>
	);
}

function EmptyMessage({ text }) {
	return (
		<p className="rounded-lg border border-dashed border-slate-500/60 px-3 py-4 text-center text-sm text-slate-700">
			{text}
		</p>
	);
}

function OrderPill({ order }) {
	const vipClass =
		order.type === "VIP"
			? "border-amber-600/80 bg-amber-100 text-amber-900"
			: "border-slate-500/60 bg-slate-100 text-slate-800";

	return (
		<div className={`rounded-lg border px-3 py-2 text-sm ${vipClass}`}>
			<p className="font-semibold tracking-wide">#{order.id}</p>
			<p className="text-xs">{order.type} ORDER</p>
			<p className="mt-1 text-[11px] opacity-75">Created {order.createdAt}</p>
			{order.completedAt ? (
				<p className="text-[11px] opacity-75">Completed {order.completedAt}</p>
			) : null}
		</div>
	);
}
