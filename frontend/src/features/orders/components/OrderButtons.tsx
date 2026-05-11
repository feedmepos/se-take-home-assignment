import { Button } from "@/components/ui/button";

const VIP_BUTTON_CLASS = "bg-amber-500 text-white hover:bg-amber-600";

interface OrderButtonsProps {
  onNewNormalOrder: () => void;
  onNewVipOrder: () => void;
}

export function OrderButtons({
  onNewNormalOrder,
  onNewVipOrder,
}: OrderButtonsProps) {
  return (
    <div className="flex gap-2">
      <Button onClick={onNewNormalOrder} data-testid="new-normal-order">
        New Normal Order
      </Button>
      <Button
        onClick={onNewVipOrder}
        className={VIP_BUTTON_CLASS}
        data-testid="new-vip-order"
      >
        New VIP Order
      </Button>
    </div>
  );
}
