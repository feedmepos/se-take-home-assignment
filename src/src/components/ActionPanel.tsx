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
  onCreateNormalOrder,
  onCreateVipOrder,
  onCreateBot,
  onRemoveBot,
}: ActionPanelProps) => {
  if (role === 'CUSTOMER') {
    return (
      <div className="grid grid-cols-2 gap-3">
        <button type="button" className="primary-action vip-action" onClick={onCreateNormalOrder}>
          <span>New Normal Order</span>
        </button>
        <button type="button" className="primary-action" onClick={onCreateVipOrder}>
          <span>New VIP Order</span>
        </button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <button type="button" className="primary-action" onClick={onCreateBot}>
        <span>Add Bot</span>
      </button>
      <button type="button" className="secondary-action" onClick={onRemoveBot}>
        <span>Delete Bot</span>
      </button>
    </div>
  )
}
