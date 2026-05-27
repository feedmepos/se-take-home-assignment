import useOrderController from './hooks/useOrderController'
import ControlPanel from './components/ControlPanel'
import PendingOrders from './components/PendingOrders'
import CompleteOrders from './components/CompleteOrders'
import BotPanel from './components/BotPanel'

export default function App() {
  const {
    state,
    pendingOrders,
    completeOrders,
    addNormalOrder,
    addVipOrder,
    addBot,
    removeBot,
  } = useOrderController()

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <h1 className="mb-6 text-center text-2xl font-bold text-gray-800 md:text-3xl">
        McDonald&apos;s Order Controller
      </h1>

      <ControlPanel
        onAddNormal={addNormalOrder}
        onAddVip={addVipOrder}
        onAddBot={addBot}
        onRemoveBot={removeBot}
        botsCount={state.bots.length}
      />

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        <PendingOrders orders={pendingOrders} />
        <BotPanel bots={state.bots} orders={state.orders} />
        <CompleteOrders orders={completeOrders} />
      </div>
    </div>
  )
}
