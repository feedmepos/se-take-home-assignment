import { useKitchenStore } from '../store/useKitchenStore';

function GoldenArches(): JSX.Element {
  return (
    <svg viewBox="0 0 48 40" className="h-9 w-11" aria-hidden>
      <path
        d="M6 38 C6 14 12 4 18 4 C22 4 24 10 24 18 C24 10 26 4 30 4 C36 4 42 14 42 38"
        fill="none"
        stroke="#FFC72C"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Header(): JSX.Element {
  const connected = useKitchenStore((s) => s.connected);

  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3.5">
        <div className="grid place-items-center rounded-2xl bg-ink-700 p-2 ring-1 ring-white/8 shadow-[0_8px_24px_-12px_rgba(255,199,44,0.4)]">
          <GoldenArches />
        </div>
        <div>
          <h1 className="font-display text-2xl font-extrabold leading-none tracking-tight text-white md:text-3xl">
            Order Control Center
          </h1>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.25em] text-white/40">
            McDonald&apos;s · Automated Kitchen
          </p>
        </div>
      </div>

      <div
        className={[
          'inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider',
          connected
            ? 'border-mint/30 bg-mint/10 text-mint'
            : 'border-ember/30 bg-ember/10 text-ember',
        ].join(' ')}
      >
        <span
          className={[
            'h-2 w-2 rounded-full',
            connected ? 'animate-pulse-dot bg-mint' : 'bg-ember',
          ].join(' ')}
        />
        {connected ? 'Live' : 'Offline'}
      </div>
    </header>
  );
}
