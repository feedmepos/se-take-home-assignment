type ControlAction = "add-bot" | "remove-bot" | "reset";
type OrderType = "vip" | "normal";

interface ControlPanelProps {
  hasBots: boolean;
  onAddOrder: (orderType: OrderType) => void;
  onAction: (action: ControlAction) => void;
}

export function ControlPanel({
  hasBots,
  onAddOrder,
  onAction,
}: ControlPanelProps) {
  return (
    <section className="controls" aria-label="订单和机器人操作">
      <button onClick={() => onAddOrder("normal")}>新增普通订单</button>
      <button className="vip-button" onClick={() => onAddOrder("vip")}>
        新增 VIP 订单
      </button>
      <button onClick={() => onAction("add-bot")}>+ 机器人</button>
      <button onClick={() => onAction("remove-bot")} disabled={!hasBots}>
        - 机器人
      </button>
      <button className="secondary-button" onClick={() => onAction("reset")}>
        重置
      </button>
    </section>
  );
}
