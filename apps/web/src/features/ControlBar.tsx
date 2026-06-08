import { motion } from 'framer-motion';
import { useState } from 'react';
import { api } from '../services/api';

type Variant = 'normal' | 'vip' | 'add' | 'remove';

interface ActionButtonProps {
  label: string;
  hint: string;
  variant: Variant;
  onClick: () => Promise<void>;
}

const variantClass: Record<Variant, string> = {
  vip: 'border-transparent bg-gradient-to-b from-gold-soft to-gold-deep text-ink-900 shadow-glow',
  normal: 'border-line/12 bg-surface-2 text-fg hover:border-line/25',
  add: 'border-mint/30 bg-mint/10 text-mint hover:bg-mint/15',
  remove: 'border-ember/30 bg-ember/10 text-ember hover:bg-ember/15',
};

function ActionButton({ label, hint, variant, onClick }: ActionButtonProps): JSX.Element {
  const [busy, setBusy] = useState(false);
  const handle = async (): Promise<void> => {
    setBusy(true);
    try {
      await onClick();
    } catch {
      // 命令失败(如断线)时静默,WS 重连后状态会自愈
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.96 }}
      whileHover={{ y: -2 }}
      disabled={busy}
      onClick={handle}
      className={[
        'flex flex-col items-start gap-0.5 rounded-2xl border px-4 py-3 text-left transition-colors disabled:opacity-60',
        variantClass[variant],
      ].join(' ')}
    >
      <span className="text-sm font-bold">{label}</span>
      <span
        className={[
          'text-[11px] font-medium',
          variant === 'vip' ? 'text-ink-900/70' : 'text-fg/40',
        ].join(' ')}
      >
        {hint}
      </span>
    </motion.button>
  );
}

export function ControlBar(): JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <ActionButton
        label="New Normal"
        hint="Add to queue"
        variant="normal"
        onClick={() => api.createOrder('NORMAL')}
      />
      <ActionButton
        label="✦ New VIP"
        hint="Priority order"
        variant="vip"
        onClick={() => api.createOrder('VIP')}
      />
      <ActionButton
        label="+ Add Bot"
        hint="Spin up a cook"
        variant="add"
        onClick={() => api.addBot()}
      />
      <ActionButton
        label="+ Add Fast Bot"
        hint="Spin up a cook"
        variant="add"
        onClick={() => api.addBot(5_000)}
      />
      <ActionButton
        label="− Remove Bot"
        hint="Destroy newest"
        variant="remove"
        onClick={() => api.removeBot()}
      />
    </div>
  );
}
