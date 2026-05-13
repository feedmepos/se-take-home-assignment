interface StatsDashboardProps {
  totalOrders: number;
  activeBots: number;
  pendingCount: number;
  completedCount: number;
}

export function StatsDashboard({
  totalOrders,
  activeBots,
  pendingCount,
  completedCount,
}: StatsDashboardProps) {
  return (
    <div className="gap-4 grid grid-cols-4 mb-8">
      <div className="bg-white shadow p-4 rounded-lg">
        <div className="font-semibold text-gray-600 text-sm">Total Orders</div>
        <div className="font-bold text-gray-800 text-3xl">{totalOrders}</div>
      </div>
      <div className="bg-white shadow p-4 rounded-lg">
        <div className="font-semibold text-gray-600 text-sm">Active Bots</div>
        <div className="font-bold text-gray-800 text-3xl">{activeBots}</div>
      </div>
      <div className="bg-white shadow p-4 rounded-lg">
        <div className="font-semibold text-gray-600 text-sm">Pending</div>
        <div className="font-bold text-yellow-600 text-3xl">{pendingCount}</div>
      </div>
      <div className="bg-white shadow p-4 rounded-lg">
        <div className="font-semibold text-gray-600 text-sm">Completed</div>
        <div className="font-bold text-green-600 text-3xl">{completedCount}</div>
      </div>
    </div>
  );
}
