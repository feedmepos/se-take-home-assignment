import { OrderType } from '../models/order';

type Props = {
    onCreateOrder: (type: OrderType) => void;
    onAddBot: () => void;
    onRemoveBot: () => void;
    disableRemoveBot: boolean;
};

export const Controls: React.FC<Props> = ({
    onCreateOrder,
    onAddBot,
    onRemoveBot,
    disableRemoveBot,
}) => (
    <div className="controls">
        <button onClick={() => onCreateOrder(OrderType.NORMAL)}>New Normal Order</button>
        <button onClick={() => onCreateOrder(OrderType.VIP)}>New VIP Order</button>
        <button onClick={onAddBot}>+ Bot</button>
        <button onClick={onRemoveBot} disabled={disableRemoveBot}>- Bot</button>
    </div>
);
