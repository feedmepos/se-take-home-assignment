import { useOrderController } from '@/hooks/useOrderController'
import { ControlBar } from '@/components/ControlBar'
import { Column } from '@/components/Column'
import { OrderCard } from '@/components/OrderCard'
import { BotStatusPanel } from '@/components/BotStatusPanel'

function App() {
  const {
    orders,
    bots,
    now,
    newNormalOrder,
    newVipOrder,
    addBot,
    removeBot,
  } = useOrderController()

  const pending = orders.filter((o) => o.status === 'PENDING')
  const processing = orders.filter((o) => o.status === 'PROCESSING')
  const complete = orders.filter((o) => o.status === 'COMPLETE')

  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col gap-5 p-5">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">
          McDonald's Order Controller
        </h1>
        <p className="text-sm text-slate-500">
          Automated cooking bot system &middot; 10s per order &middot; VIP
          priority
        </p>
      </header>

      <ControlBar
        onNewNormal={newNormalOrder}
        onNewVip={newVipOrder}
        onAddBot={addBot}
        onRemoveBot={removeBot}
        botCount={bots.length}
      />

      <div className="grid min-h-[420px] flex-1 grid-cols-1 gap-4 md:grid-cols-3">
        <Column title="Pending" count={pending.length} accent="bg-slate-500">
          {pending.map((o) => (
            <OrderCard key={o.id} order={o} now={now} />
          ))}
        </Column>
        <Column
          title="Processing"
          count={processing.length}
          accent="bg-emerald-500"
        >
          {processing.map((o) => (
            <OrderCard key={o.id} order={o} now={now} />
          ))}
        </Column>
        <Column title="Complete" count={complete.length} accent="bg-slate-900">
          {complete.map((o) => (
            <OrderCard key={o.id} order={o} now={now} />
          ))}
        </Column>
      </div>

      <BotStatusPanel bots={bots} />
    </div>
  )
}

export default App
