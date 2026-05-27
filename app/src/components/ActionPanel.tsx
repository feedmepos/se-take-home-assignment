import { Bot, Crown, Minus, Plus, ReceiptText } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Role } from '../domain/types'

type ActionPanelProps = {
  role: Role
  botCount: number
  onCreateNormalOrder: () => void
  onCreateVipOrder: () => void
  onCreateBot: () => void
  onRemoveBot: () => void
}

/**
 * Renders the role-specific command area. Customers see order creation actions,
 * while managers see bot controls.
 *
 * @example
 * <ActionPanel role="MANAGER" botCount={2} onCreateBot={createBot} />
 */
export const ActionPanel = ({
  role,
  botCount,
  onCreateNormalOrder,
  onCreateVipOrder,
  onCreateBot,
  onRemoveBot,
}: ActionPanelProps) => {
  if (role === 'NORMAL_CUSTOMER') {
    return (
      <ActionShell title="Customer counter" eyebrow="Normal flow">
        <button type="button" className="primary-action" onClick={onCreateNormalOrder}>
          <ReceiptText aria-hidden="true" size={20} />
          <span>New Normal Order</span>
        </button>
      </ActionShell>
    )
  }

  if (role === 'VIP_MEMBER') {
    return (
      <ActionShell title="Priority lane" eyebrow="VIP flow">
        <button type="button" className="primary-action vip-action" onClick={onCreateVipOrder}>
          <Crown aria-hidden="true" size={20} />
          <span>New VIP Order</span>
        </button>
      </ActionShell>
    )
  }

  return (
    <ActionShell title="Kitchen control" eyebrow={`${botCount} bot${botCount === 1 ? '' : 's'} online`}>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" className="primary-action" aria-label="+ Bot" onClick={onCreateBot}>
          <Plus aria-hidden="true" size={21} />
          <span>Bot</span>
        </button>
        <button type="button" className="secondary-action" aria-label="- Bot" onClick={onRemoveBot}>
          <Minus aria-hidden="true" size={21} />
          <span>Bot</span>
        </button>
      </div>
      <div className="mt-3 flex items-center gap-2 text-sm font-medium text-zinc-500">
        <Bot aria-hidden="true" size={17} />
        <span>Newest bot is removed first.</span>
      </div>
    </ActionShell>
  )
}

type ActionShellProps = {
  eyebrow: string
  title: string
  children: ReactNode
}

const ActionShell = ({ eyebrow, title, children }: ActionShellProps) => (
  <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
    <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-700">{eyebrow}</p>
    <h2 className="mt-2 text-2xl font-black text-zinc-950">{title}</h2>
    <div className="mt-5">{children}</div>
  </section>
)
