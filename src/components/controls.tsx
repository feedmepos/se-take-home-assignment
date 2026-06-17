import { Button } from '@/components/ui/button';
import { useBots } from '@/store/use-order-controller';
import { controllerActions } from '@/store/use-order-controller';

export function Controls() {
  const bots = useBots();

  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={controllerActions.addNormalOrder}>New Normal Order</Button>
      <Button variant="secondary" onClick={controllerActions.addVipOrder}>
        New VIP Order
      </Button>
      <Button variant="outline" onClick={controllerActions.addBot}>
        + Bot
      </Button>
      {/* Disabled when no bots exist — prevents a confusing no-op */}
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
