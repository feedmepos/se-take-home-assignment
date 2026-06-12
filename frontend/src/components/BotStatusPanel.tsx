import { Bot as BotIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import type { Bot } from '@/hooks/useOrderController'

interface BotStatusPanelProps {
  bots: Bot[]
}

export function BotStatusPanel({ bots }: BotStatusPanelProps) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <BotIcon className="size-4 text-slate-600" />
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">
          Bot Status
        </h2>
        <span className="text-xs text-slate-400">({bots.length})</span>
      </div>
      {bots.length === 0 ? (
        <p className="text-sm text-slate-400">
          No bots. Add one to start cooking.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {bots
            .slice()
            .sort((a, b) => a.id - b.id)
            .map((bot) => {
              const busy = bot.status === 'PROCESSING'
              return (
                <li
                  key={bot.id}
                  className="flex items-center gap-2 rounded-lg border bg-slate-50 px-3 py-2"
                >
                  <span className="font-semibold">Bot #{bot.id}</span>
                  <Badge variant={busy ? 'busy' : 'idle'}>
                    {busy
                      ? `Processing Order #${bot.processingOrderId}`
                      : 'IDLE'}
                  </Badge>
                </li>
              )
            })}
        </ul>
      )}
    </div>
  )
}
