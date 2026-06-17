import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
// BotShelf needs both bots and processing-order details, so it uses the full
// snapshot rather than the narrower useBots() selector.
import { useSnapshot } from '@/store/use-order-controller';
import { Countdown } from './countdown';

export function BotShelf() {
  const snap = useSnapshot();

  return (
    <div className="w-52 shrink-0">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">
        Bots{' '}
        <span className="ml-1 rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
          {snap.bots.length}
        </span>
      </h2>
      <div className="flex flex-col gap-2">
        {snap.bots.map((bot) => {
          // Pair a processing bot with its order to show order type
          const order =
            bot.status === 'PROCESSING'
              ? snap.processing.find((o) => o.id === bot.currentOrderId)
              : undefined;

          return (
            <Card key={bot.id}>
              <CardContent className="flex items-center justify-between gap-2 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-slate-600">Bot #{bot.id}</span>
                  {order !== undefined && (
                    <Badge variant={order.type === 'VIP' ? 'vip' : 'default'}>{order.type}</Badge>
                  )}
                </div>
                {bot.status === 'PROCESSING' ? (
                  <Countdown endsAt={bot.processingEndsAt} />
                ) : (
                  <Badge variant="default">IDLE</Badge>
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
