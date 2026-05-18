'use client';

interface OrderControlsProps {
  onCreateNormalOrder: () => void;
  onCreateVipOrder: () => void;
}

export function OrderControls({ onCreateNormalOrder, onCreateVipOrder }: OrderControlsProps) {
  return (
    <div className="border-4 border-indigo-400 rounded-xl p-4 bg-white">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Order Controls</h2>
      <div className="flex gap-4">
        <button
          onClick={onCreateNormalOrder}
          className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
        >
          New Normal Order
        </button>
        <button
          onClick={onCreateVipOrder}
          className="flex-1 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"
        >
          New VIP Order
        </button>
      </div>
    </div>
  );
}
