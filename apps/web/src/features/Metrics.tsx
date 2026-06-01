import { useKitchenStore } from '../store/useKitchenStore';

interface StatProps {
  label: string;
  value: number;
  accent?: 'gold' | 'mint' | 'neutral';
}

function Stat({ label, value, accent = 'neutral' }: StatProps): JSX.Element {
  const valueColor =
    accent === 'gold' ? 'text-gold' : accent === 'mint' ? 'text-mint' : 'text-white';
  return (
    <div className="grain-card rounded-2xl border border-white/8 bg-ink-700 px-4 py-3.5">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/40">{label}</p>
      <p className={`mt-1 font-mono text-3xl font-semibold tabular-nums ${valueColor}`}>
        {String(value).padStart(2, '0')}
      </p>
    </div>
  );
}

export function Metrics(): JSX.Element {
  const pending = useKitchenStore((s) => s.pending.length);
  const processing = useKitchenStore((s) => s.processing.length);
  const complete = useKitchenStore((s) => s.complete.length);
  const bots = useKitchenStore((s) => s.bots.length);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Stat label="Pending" value={pending} accent="gold" />
      <Stat label="Processing" value={processing} />
      <Stat label="Completed" value={complete} accent="mint" />
      <Stat label="Active Bots" value={bots} />
    </div>
  );
}
