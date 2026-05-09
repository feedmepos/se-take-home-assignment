"use client";

export function StatsBar({ pending, processing, complete, bots }: {
  pending: number;
  processing: number;
  complete: number;
  bots: number;
}) {
  const stats = [
    { label: "Pending", value: pending },
    { label: "Processing", value: processing },
    { label: "Complete", value: complete },
    { label: "Bots", value: bots },
  ];

  return (
    <div className="stats-bar">
      {stats.map((s) => (
        <div key={s.label} className="stat">
          <span className="stat-value">{s.value}</span>
          <span className="stat-label">{s.label}</span>
        </div>
      ))}
    </div>
  );
}
