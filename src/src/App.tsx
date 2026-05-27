import { useState } from 'react'
import { ActionPanel } from './components/ActionPanel'
import { BotPanel } from './components/BotPanel'
import { OrderColumn } from './components/OrderColumn'
import { ThreeRole } from './components/ThreeRole'
import { StatusRail } from './components/StatusRail'
import type { Role } from './domain/types'
import { useOrderController } from './hooks/useOrderController'

/**
 * Root application shell that wires the controller hook into role controls,
 * command panels, bot status, and order lanes.
 */
const App = () => {
  const [activeRole, setActiveRole] = useState<Role>('CUSTOMER')
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
    <main className="min-h-screen bg-sky-100 text-zinc-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex justify-center">
          <ThreeRole activeRole={activeRole} onRoleChange={setActiveRole} />
        </header>

        <ActionPanel
          role={activeRole}
          botCount={state.bots.length}
          onCreateNormalOrder={() => createOrder('NORMAL')}
          onCreateVipOrder={() => createOrder('VIP')}
          onCreateBot={createBot}
          onRemoveBot={destroyNewestBot}
        />
        <StatusRail
          pendingCount={pendingOrders.length}
          processingCount={processingOrders.length}
          completeCount={completeOrders.length}
          botCount={state.bots.length}
        />

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <div className="grid content-start gap-6">
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
