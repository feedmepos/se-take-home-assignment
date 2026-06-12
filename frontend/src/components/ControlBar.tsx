import { Plus, Minus, ShoppingBag, Crown } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface ControlBarProps {
  onNewNormal: () => void
  onNewVip: () => void
  onAddBot: () => void
  onRemoveBot: () => void
  botCount: number
}

export function ControlBar({
  onNewNormal,
  onNewVip,
  onAddBot,
  onRemoveBot,
  botCount,
}: ControlBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="outline" onClick={onNewNormal}>
        <ShoppingBag className="size-4" />
        New Normal Order
      </Button>
      <Button variant="amber" onClick={onNewVip}>
        <Crown className="size-4" />
        New VIP Order
      </Button>
      <div className="ml-auto flex items-center gap-2">
        <Button onClick={onAddBot}>
          <Plus className="size-4" />
          Bot
        </Button>
        <Button
          variant="destructive"
          onClick={onRemoveBot}
          disabled={botCount === 0}
        >
          <Minus className="size-4" />
          Bot
        </Button>
      </div>
    </div>
  )
}
