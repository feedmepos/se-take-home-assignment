import { useEffect, useRef, useState } from 'react'
import { createKitchenStore } from './store'
import { InMemoryPort } from './infrastructure'
import { sortPending } from './domain'
import { ORDER_STATUS, ROLE, type Role } from './domain'
import { TICK_INTERVAL_MS } from './config'
import RoleSwitcher from './components/RoleSwitcher'
import ManagerView from './components/ManagerView'
import CustomerView from './components/CustomerView'

const port = new InMemoryPort()
const useStore = createKitchenStore(port)

export default function App() {
  const orders = useStore((s) => s.orders)
  const bots = useStore((s) => s.bots)
  const addNormalOrder = useStore((s) => s.addNormalOrder)
  const addVipOrder = useStore((s) => s.addVipOrder)
  const addBot = useStore((s) => s.addBot)
  const removeBot = useStore((s) => s.removeBot)
  const tick = useStore((s) => s.tick)

  const [role, setRole] = useState<Role>(ROLE.MANAGER)
  const [now, setNow] = useState(Date.now())
  const tickRef = useRef(tick)
  tickRef.current = tick

  useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now()
      tickRef.current(t)
      setNow(t)
    }, TICK_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  const sortedPending = sortPending(orders)
  const completed = orders
    .filter((o) => o.status === ORDER_STATUS.COMPLETED)
    .sort((a, b) => (a.completedAt ?? 0) - (b.completedAt ?? 0))
  const myOrders = orders.filter((o) => o.placedBy === role)
  const orderCount = orders.filter((o) => o.status !== ORDER_STATUS.COMPLETED).length
  const isManager = role === ROLE.MANAGER

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <div className="bg-mcd-red text-white">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🍔</span>
            <h1 className="text-xl font-bold tracking-wide">McDonald's · {isManager ? '自动厨房控制系统' : '点餐系统'}</h1>
          </div>
          <RoleSwitcher role={role} onChange={setRole} />
        </div>
      </div>

      {isManager ? (
        <ManagerView
          pending={sortedPending}
          completed={completed}
          bots={bots}
          now={now}
          orders={orders}
          orderCount={orderCount}
          onNormalOrder={() => addNormalOrder(ROLE.MANAGER)}
          onVipOrder={() => addVipOrder(ROLE.MANAGER)}
          onAddBot={addBot}
          onRemoveBot={removeBot}
        />
      ) : (
        <CustomerView
          role={role}
          myOrders={myOrders}
          pending={sortedPending}
          bots={bots}
          now={now}
          onOrder={() => role === ROLE.VIP_CUSTOMER ? addVipOrder(role) : addNormalOrder(role)}
          onOrderLabel={role === ROLE.VIP_CUSTOMER ? '⭐ 下 VIP 单' : '🍔 下普通单'}
        />
      )}
    </div>
  )
}
