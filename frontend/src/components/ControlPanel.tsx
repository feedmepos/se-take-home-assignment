import React from 'react';
import { PlusCircle, Plus, Minus, Star } from 'lucide-react';
import type { OrderType } from '../types';

interface ControlPanelProps {
  onAddOrder: (type: OrderType) => void;
  onAddBot: () => void;
  onRemoveBot: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  onAddOrder,
  onAddBot,
  onRemoveBot,
}) => {
  return (
    <div className="control-panel">
      <button className="btn btn-normal" onClick={() => onAddOrder('NORMAL')}>
        <PlusCircle size={20} />
        New Normal Order
      </button>
      
      <button className="btn btn-vip" onClick={() => onAddOrder('VIP')}>
        <Star size={20} />
        New VIP Order
      </button>
      
      <button className="btn btn-add-bot" onClick={onAddBot}>
        <Plus size={20} />
        + Bot
      </button>
      
      <button className="btn btn-remove-bot" onClick={onRemoveBot}>
        <Minus size={20} />
        - Bot
      </button>
    </div>
  );
};
