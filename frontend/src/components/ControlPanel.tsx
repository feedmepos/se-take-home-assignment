import { useOrderContext } from '../hooks/useOrderContext'
import { Button } from '@/components/ui/button'

export function ControlPanel() {
  const { state, dispatch } = useOrderContext()

  return (
    <div className="bg-white border-b border-[#DDD5C8] px-4 py-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-8">

        {/* Orders group */}
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2.5">
            Place Order
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => dispatch({ type: 'ADD_NORMAL_ORDER' })}
              className="rounded-full px-5 h-10 text-sm font-semibold bg-[#DA291C] hover:bg-[#B01E14] text-white border-0 shadow-sm"
            >
              New Normal Order
            </Button>
            <Button
              onClick={() => dispatch({ type: 'ADD_VIP_ORDER' })}
              className="rounded-full px-5 h-10 text-sm font-bold bg-[#FFC72C] hover:bg-[#E6A800] text-[#27251F] border-0 shadow-sm"
            >
              New VIP Order
            </Button>
          </div>
        </div>

        {/* Divider on mobile */}
        <div className="border-t border-[#EDE8E1] sm:hidden" />

        {/* Bot management group */}
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2.5">
            Bot Management
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => dispatch({ type: 'ADD_BOT' })}
              className="rounded-full px-5 h-10 text-sm font-semibold bg-[#27251F] hover:bg-[#3D3830] text-white border-0 shadow-sm"
            >
              + Bot
            </Button>
            <Button
              onClick={() => dispatch({ type: 'REMOVE_BOT' })}
              className="rounded-full px-5 h-10 text-sm font-semibold border-2 border-[#DA291C] text-[#DA291C] bg-transparent hover:bg-[#DA291C] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              disabled={state.bots.length === 0}
            >
              - Bot
            </Button>
          </div>
        </div>

      </div>
    </div>
  )
}
