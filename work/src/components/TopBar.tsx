interface TopBarProps {
  pendingCount: number;
  botCount: number;
  completedCount: number;
}

export function TopBar({
  pendingCount,
  botCount,
  completedCount,
}: TopBarProps) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">FeedMe 面试作业原型</p>
        <h1>麦当劳订单控制器</h1>
      </div>
      <div className="stats" aria-label="订单概览">
        <Stat label="等待中" value={pendingCount} />
        <Stat label="机器人" value={botCount} />
        <Stat label="已完成" value={completedCount} />
      </div>
    </header>
  );
}

// 单项统计保持为私有子组件，避免给 components 目录增加过细的文件颗粒度。
function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
