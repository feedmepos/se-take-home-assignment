import type { Bot, Order } from '../reducer/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface BotCardProps {
  bot: Bot
  processingOrder: Order | undefined
}

export function BotCard({ bot, processingOrder }: BotCardProps) {
  return (
    <Card className="p-3 rounded-2xl shadow-sm min-w-[130px]">
      <p className="font-bold text-sm text-gray-800">Bot #{bot.id}</p>
      {bot.status === 'IDLE' ? (
        <Badge variant="secondary" className="mt-1 text-xs">○ Idle</Badge>
      ) : (
        <Badge className="mt-1 text-xs bg-orange-500 text-white hover:bg-orange-500">
          ● Order #{processingOrder?.id}
        </Badge>
      )}
    </Card>
  )
}
