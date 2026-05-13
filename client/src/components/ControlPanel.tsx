interface ControlPanelProps {
  onCreateNormalOrder: () => void;
  onCreateVipOrder: () => void;
  onCreateBot: () => void;
  onRemoveBot: () => void;
  onReset: () => void;
  loading: boolean;
}

export function ControlPanel({
  onCreateNormalOrder,
  onCreateVipOrder,
  onCreateBot,
  onRemoveBot,
  onReset,
  loading,
}: ControlPanelProps) {
  return (
    <div className="bg-white shadow-lg mb-8 p-6 rounded-lg">
      <h2 className="mb-4 font-bold text-gray-800 text-xl">Control Panel</h2>
      <div className="gap-3 grid grid-cols-2 md:grid-cols-5">
        <button
          onClick={onCreateNormalOrder}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 px-4 py-2 rounded font-bold text-white transition"
        >
          + Normal Order
        </button>
        <button
          onClick={onCreateVipOrder}
          disabled={loading}
          className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 px-4 py-2 rounded font-bold text-white transition"
        >
          + VIP Order
        </button>
        <button
          onClick={onCreateBot}
          disabled={loading}
          className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 px-4 py-2 rounded font-bold text-white transition"
        >
          + Bot
        </button>
        <button
          onClick={onRemoveBot}
          disabled={loading}
          className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 px-4 py-2 rounded font-bold text-white transition"
        >
          - Bot
        </button>
        <button
          onClick={onReset}
          disabled={loading}
          className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 px-4 py-2 rounded font-bold text-white transition"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
