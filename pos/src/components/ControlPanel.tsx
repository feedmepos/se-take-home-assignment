import { Button } from './ui/button'
import { Plus, Minus, Star, Cpu, ListChecks, Trash2 } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { cn } from '@/lib/utils'
import { Separator } from './ui/separator'

interface ControlPanelProps {
  onCreateOrder: (type?: 'NORMAL' | 'VIP') => void
  onAddBot: () => void
  onRemoveBot: () => void
  onClearOrders?: () => void
  botCount: number
  isCreating?: boolean
}

export function ControlPanel({
  onCreateOrder,
  onAddBot,
  onRemoveBot,
  onClearOrders,
  botCount,
  isCreating = false,
}: ControlPanelProps) {
  const { state } = useAuthStore()
  const user = state.user

  const isManager = user?.role === 'MANAGER'
  const canManageBots = isManager

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-fit px-6 pointer-events-none">
      <div className="glass shadow-2xl rounded-md px-6 py-4 flex items-center gap-8 ring-1 ring-white/10 pointer-events-auto">
        {/* Order Controls */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-1">
              Order
            </span>
            <div className="flex items-center gap-2">
              {isManager ? (
                <>
                  <Button
                    onClick={() => onCreateOrder('NORMAL')}
                    disabled={isCreating}
                    variant="default"
                    size="sm"
                    className="h-10 px-4 rounded-md gap-2 font-bold shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    Order
                  </Button>

                  <Button
                    onClick={() => onCreateOrder('VIP')}
                    disabled={isCreating}
                    variant="outline"
                    size="sm"
                    className="h-10 px-4 rounded-md gap-2 font-bold border-amber-500/30 text-amber-500 bg-amber-500/5 transition-all hover:bg-amber-500/10 hover:scale-105 active:scale-95"
                  >
                    <Star className="w-4 h-4 fill-amber-500" />
                    VIP Order
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => onCreateOrder()}
                  disabled={isCreating}
                  variant="default"
                  size="sm"
                  className="h-10 px-4 rounded-md gap-2 font-bold shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  Create Order
                </Button>
              )}
            </div>
          </div>
        </div>

        {canManageBots && (
          <>
            <Separator orientation="vertical" className="h-10 bg-white/10" />

            {/* Bot Controls */}
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-1">
                  Fleet ({botCount})
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={onAddBot}
                    disabled={isCreating}
                    variant="secondary"
                    size="sm"
                    className="h-10 px-4 rounded-md gap-2 font-bold bg-white/5 border border-white/10 transition-all hover:bg-white/10 hover:scale-105 active:scale-95"
                  >
                    <Plus className="w-4 h-4 text-blue-400" />
                    Deploy Bot
                  </Button>

                  {botCount > 0 && (
                    <Button
                      onClick={onRemoveBot}
                      disabled={isCreating}
                      variant="outline"
                      size="sm"
                      className="h-10 w-10 p-0 rounded-md border-destructive/20 text-destructive bg-destructive/5 transition-all hover:bg-destructive/10 hover:scale-105 active:scale-95"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {isManager && onClearOrders && (
          <>
            <Separator orientation="vertical" className="h-10 bg-white/10" />

            {/* Clear All Orders */}
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-1">
                  Manage
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={onClearOrders}
                    disabled={isCreating}
                    variant="outline"
                    size="sm"
                    className="h-10 px-4 rounded-md gap-2 font-bold border-destructive/30 text-destructive bg-destructive/5 transition-all hover:bg-destructive/10 hover:scale-105 active:scale-95"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear All Orders
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
