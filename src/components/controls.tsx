import { Button } from '@/components/ui/button';
import { controllerActions, useBots } from '@/store/use-order-controller';

export function Controls() {
  const bots = useBots();

  return (
    <div className="rounded-xl bg-white border border-slate-200 shadow-sm px-4 py-3 flex flex-wrap gap-2">
      <Button onClick={controllerActions.addNormalOrder}>New Normal Order</Button>
      {/* Gold = VIP tier — matches VIP badge colour */}
      <Button variant="secondary" onClick={controllerActions.addVipOrder}>
        New VIP Order
      </Button>
      {/* Green = positive action: add capacity */}
      <Button variant="success" onClick={controllerActions.addBot}>
        + Bot
      </Button>
      {/* Red = destructive action: remove capacity; disabled when no bots */}
      <Button
        variant="destructive"
        onClick={controllerActions.removeBot}
        disabled={bots.length === 0}
      >
        - Bot
      </Button>
    </div>
  );
}
