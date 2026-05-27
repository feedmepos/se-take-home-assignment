import { useState } from 'react'
import { ActionPanel } from './components/ActionPanel'
import { BotPanel } from './components/BotPanel'
import { OrderColumn } from './components/OrderColumn'
import { RoleTabs } from './components/RoleTabs'
import { StatusRail } from './components/StatusRail'
import type { Role } from './domain/types'
import { useOrderController } from './hooks/useOrderController'

/**
 * Root application shell that wires the controller hook into role controls,
 * command panels, bot status, and order lanes.
 */
const App = () => {
  const [activeRole, setActiveRole] = useState<Role>('NORMAL_CUSTOMER')
  const {
    state,
    clock,
    pendingOrders,
    processingOrders,
    completeOrders,
    createOrder,
    createBot,
    destroyNewestBot,
  } = useOrderController()

  return (
    <main className="min-h-screen bg-[#f7f1e5] text-zinc-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="grid gap-5 rounded-lg border border-zinc-950 bg-[#ffd829] p-5 shadow-[8px_8px_0_#18181b] lg:grid-cols-[1fr_520px] lg:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-red-800">
              FeedMe order controller
            </p>
            <h1 className="mt-2 max-w-3xl text-4xl font-black leading-tight text-zinc-950 md:text-6xl">
              McDonald's kitchen queue
            </h1>
            <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-zinc-800">
              Shared in-memory state for customer orders, VIP priority, and live cooking bot
              scheduling.
            </p>
          </div>
          <RoleTabs activeRole={activeRole} onRoleChange={setActiveRole} />
        </header>

        <StatusRail
          pendingCount={pendingOrders.length}
          processingCount={processingOrders.length}
          completeCount={completeOrders.length}
          botCount={state.bots.length}
        />

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <div className="grid content-start gap-6">
            <ActionPanel
              role={activeRole}
              botCount={state.bots.length}
              onCreateNormalOrder={() => createOrder('NORMAL')}
              onCreateVipOrder={() => createOrder('VIP')}
              onCreateBot={createBot}
              onRemoveBot={destroyNewestBot}
            />
            <BotPanel bots={state.bots} orders={state.orders} now={clock} />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <OrderColumn title="PENDING" orders={pendingOrders} />
            <OrderColumn title="COMPLETE" orders={completeOrders} />
          </div>
        </div>
      </div>
    </main>
  )
}

export default App
