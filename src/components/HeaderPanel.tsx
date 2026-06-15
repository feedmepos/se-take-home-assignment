import { type Order } from '../types'

interface HeaderPanelProps {
  pendingOrders: Order[]
  completedOrders: Order[]
}

export default function HeaderPanel({ pendingOrders, completedOrders }: HeaderPanelProps) {
  return (
    <div className="top-panels">
      <div className="panel panel-pending">
        <div className="panel-header">
          <h2>PENDING</h2>
          <span className="panel-count">{pendingOrders.length}</span>
        </div>
        <div className="panel-body">
          {pendingOrders.length === 0 ? (
            <div className="panel-empty">No Order</div>
          ) : (
            pendingOrders.map(order => (
              <div key={order.id} className={`order-item${order.type === 'vip' ? ' order-vip' : ''}`}>
                <span className="order-id">#{order.id}</span>
                {order.type === 'vip' && <span className="vip-badge">VIP</span>}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="panel panel-completed">
        <div className="panel-header">
          <h2>COMPLETED</h2>
          <span className="panel-count">{completedOrders.length}</span>
        </div>
        <div className="panel-body">
          {completedOrders.length === 0 ? (
            <div className="panel-empty">No Order</div>
          ) : (
            completedOrders.map(order => (
              <div key={order.id} className={`order-item${order.type === 'vip' ? ' order-vip' : ''}`}>
                <span className="order-id">#{order.id}</span>
                {order.type === 'vip' && <span className="vip-badge">VIP</span>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
