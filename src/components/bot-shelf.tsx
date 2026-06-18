// BotShelf needs both bots and processing-order details, so it uses the full
// snapshot rather than the narrower useBots() selector.
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useSnapshot } from '@/store/use-order-controller';
import { Countdown } from './countdown';

export function BotShelf() {
  const snap = useSnapshot();

  return (
    <div className="w-56 shrink-0 rounded-xl bg-white border border-slate-200 shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Bots</h2>
        <span className="rounded-full bg-[#DA291C] px-2 py-0.5 text-xs font-bold text-white">
          {snap.bots.length}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {snap.bots.map((bot) => {
          // Pair a processing bot with its order so we can show the order # —
          // without this, there is no way to tell which order a bot is cooking.
          const order =
            bot.status === 'PROCESSING'
              ? snap.processing.find((o) => o.id === bot.currentOrderId)
              : undefined;

          return (
            <Card key={bot.id}>
              <CardContent className="py-3 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono font-semibold text-slate-700">
                    Bot #{bot.id}
                  </span>
                  {bot.status === 'IDLE' && <Badge variant="default">IDLE</Badge>}
                </div>

                {bot.status === 'PROCESSING' && order !== undefined ? (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono text-slate-500">Order #{order.id}</span>
                      <Badge variant={order.type === 'VIP' ? 'vip' : 'default'}>{order.type}</Badge>
                    </div>
                    <Countdown endsAt={bot.processingEndsAt} />
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Waiting for orders</p>
                )}
              </CardContent>
            </Card>
          );
        })}
        {snap.bots.length === 0 && <p className="text-sm text-slate-400 italic">No bots</p>}
      </div>
    </div>
  );
}
