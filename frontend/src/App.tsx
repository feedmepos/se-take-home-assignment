import { OrderProvider } from './context/OrderContext'
import { ControlPanel } from './components/ControlPanel'
import { BotStatus } from './components/BotStatus'
import { OrderBoard } from './components/OrderBoard'

export default function App() {
  return (
    <OrderProvider>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-gray-900 text-white px-4 py-3 shadow-lg sticky top-0 z-10">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <h1 className="text-lg font-bold tracking-tight">🍔 McDonald's Order Controller</h1>
            <span className="text-xs text-gray-400">Order Management System</span>
          </div>
        </header>
        <main className="max-w-5xl mx-auto pt-2">
          <ControlPanel />
          {/* BotStatus shows on mobile/tablet; hidden on lg (shown in OrderBoard sidebar) */}
          <div className="lg:hidden">
            <BotStatus />
          </div>
          <OrderBoard />
        </main>
      </div>
    </OrderProvider>
  )
}
