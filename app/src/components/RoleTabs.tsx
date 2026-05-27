import { Crown, Settings2, UserRound } from 'lucide-react'
import type { Role } from '../domain/types'

const roleOptions: Array<{
  role: Role
  label: string
  icon: typeof UserRound
}> = [
  { role: 'NORMAL_CUSTOMER', label: 'Normal Customer', icon: UserRound },
  { role: 'VIP_MEMBER', label: 'VIP Member', icon: Crown },
  { role: 'MANAGER', label: 'Manager', icon: Settings2 },
]

type RoleTabsProps = {
  activeRole: Role
  onRoleChange: (role: Role) => void
}

/**
 * Lets the demo switch between the three human role views without resetting
 * the shared order and bot state.
 *
 * @example
 * <RoleTabs activeRole={activeRole} onRoleChange={setActiveRole} />
 */
export const RoleTabs = ({ activeRole, onRoleChange }: RoleTabsProps) => (
  <div
    className="grid gap-2 rounded-lg border border-zinc-200 bg-white p-1 shadow-sm md:grid-cols-3"
    role="tablist"
    aria-label="Role view"
  >
    {roleOptions.map(({ role, label, icon: Icon }) => {
      const isActive = activeRole === role

      return (
        <button
          key={role}
          type="button"
          role="tab"
          aria-selected={isActive}
          className={[
            'inline-flex h-12 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition',
            isActive
              ? 'bg-zinc-950 text-white shadow-sm'
              : 'text-zinc-600 hover:bg-amber-50 hover:text-zinc-950',
          ].join(' ')}
          onClick={() => onRoleChange(role)}
        >
          <Icon aria-hidden="true" size={17} strokeWidth={2.2} />
          <span>{label}</span>
        </button>
      )
    })}
  </div>
)
