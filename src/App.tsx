import { useRef } from 'react'
import { OrderController } from './core/OrderController'
import { useOrderController } from './hooks/useOrderController'
import { useNow } from './hooks/useNow'
import { Controls } from './components/Controls'
import { Column } from './components/Column'
import { BotPanel } from './components/BotPanel'
import { OrderCard } from './components/OrderCard'

function App() {
  // One controller instance for the app's lifetime (stable across renders).
  const controllerRef = useRef<OrderController | null>(null)
  if (controllerRef.current === null) {
    controllerRef.current = new OrderController()
  }
  const controller = controllerRef.current

  const { pending, complete, bots } = useOrderController(controller)
  const totalMs = controller.processDurationMs

  const idleBots = bots.filter((b) => b.status === 'IDLE').length
  const anyCooking = idleBots < bots.length
  const now = useNow(anyCooking)

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-5 p-5">
      <header className="rounded-xl bg-red-600 px-6 py-4 text-white shadow">
        <h1 className="text-2xl font-bold">
          🍔 McDonald's Automated Cooking-Bot Controller
        </h1>
        <p className="mt-1 text-sm text-red-100">
          VIP orders jump the queue · each bot cooks one order in{' '}
          {totalMs / 1000}s · newest bot is removed first
        </p>
      </header>

      <Controls
        onNewNormal={() => controller.addOrder('NORMAL')}
        onNewVip={() => controller.addOrder('VIP')}
        onAddBot={() => controller.addBot()}
        onRemoveBot={() => controller.removeBot()}
        botCount={bots.length}
      />

      <div className="flex flex-wrap gap-4 text-sm text-slate-500">
        <span>
          Pending: <strong className="text-slate-700">{pending.length}</strong>
        </span>
        <span>
          Bots: <strong className="text-slate-700">{bots.length}</strong> ({idleBots} idle)
        </span>
        <span>
          Completed: <strong className="text-slate-700">{complete.length}</strong>
        </span>
      </div>

      <main className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-3">
        <Column
          title="⏳ Pending"
          count={pending.length}
          accent="bg-slate-200 text-slate-700"
          emptyText="No pending orders."
        >
          {pending.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </Column>

        <BotPanel bots={bots} now={now} totalMs={totalMs} />

        <Column
          title="✅ Complete"
          count={complete.length}
          accent="bg-green-200 text-green-800"
          emptyText="No completed orders yet."
        >
          {complete.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </Column>
      </main>

      <footer className="pt-2 text-center text-xs text-slate-400">
        In-memory prototype · React + TypeScript + Vite · logic in{' '}
        <code>src/core/OrderController.ts</code>
      </footer>
    </div>
  )
}

export default App
