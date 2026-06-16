import { useOrderContext } from '../hooks/useOrderContext'
import { Button } from '@/components/ui/button'

export function ControlPanel() {
  const { state, dispatch } = useOrderContext()

  return (
    <div className="grid grid-cols-2 gap-2 p-4 sm:flex sm:flex-row sm:flex-wrap sm:gap-3">
      <Button
        onClick={() => dispatch({ type: 'ADD_NORMAL_ORDER' })}
        variant="outline"
        className="text-sm"
      >
        + Normal Order
      </Button>
      <Button
        onClick={() => dispatch({ type: 'ADD_VIP_ORDER' })}
        className="text-sm bg-amber-500 hover:bg-amber-600 text-white"
      >
        👑 + VIP Order
      </Button>
      <Button
        onClick={() => dispatch({ type: 'ADD_BOT' })}
        variant="outline"
        className="text-sm"
      >
        + Bot
      </Button>
      <Button
        onClick={() => dispatch({ type: 'REMOVE_BOT' })}
        variant="destructive"
        className="text-sm"
        disabled={state.bots.length === 0}
      >
        - Bot
      </Button>
    </div>
  )
}
