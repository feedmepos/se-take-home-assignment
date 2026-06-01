import { useKitchenStore } from '../store/useKitchenStore';
import { useNow } from '../hooks/useNow';
import { OrderColumn } from './OrderColumn';

export function OrderBoard(): JSX.Element {
  const now = useNow();
  const pending = useKitchenStore((s) => s.pending);
  const processing = useKitchenStore((s) => s.processing);
  const complete = useKitchenStore((s) => s.complete);
  const bots = useKitchenStore((s) => s.bots);
  const startedAt = useKitchenStore((s) => s.startedAt);

  // orderId → 正在处理它的机器人编号
  const botByOrder: Record<number, number> = {};
  for (const bot of bots) {
    if (bot.currentOrderId !== null) botByOrder[bot.currentOrderId] = bot.id;
  }

  // 最近完成的排在前面,更符合直觉
  const completeNewestFirst = [...complete].reverse();

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <OrderColumn
        title="Pending"
        accent="gold"
        orders={pending}
        now={now}
        startedAt={startedAt}
        botByOrder={botByOrder}
        emptyHint="No orders waiting"
      />
      <OrderColumn
        title="Processing"
        accent="plain"
        orders={processing}
        now={now}
        startedAt={startedAt}
        botByOrder={botByOrder}
        emptyHint="No bots cooking"
      />
      <OrderColumn
        title="Complete"
        accent="mint"
        orders={completeNewestFirst}
        now={now}
        startedAt={startedAt}
        botByOrder={botByOrder}
        emptyHint="Nothing served yet"
      />
    </div>
  );
}
