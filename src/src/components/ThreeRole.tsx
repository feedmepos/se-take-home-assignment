import type { Role } from '../domain/types'

const roleOptions: Array<{
  role: Role
  label: string
}> = [
  { role: 'CUSTOMER', label: 'Customer' },
  { role: 'MANAGER', label: 'Manager' },
]

type ThreeRoleProps = {
  activeRole: Role
  onRoleChange: (role: Role) => void
}

/**
 * Lets the demo switch between the three human role views without resetting
 * the shared order and bot state.
 *
 * @example
 * <ThreeRole activeRole={activeRole} onRoleChange={setActiveRole} />
 */
export const ThreeRole = ({ activeRole, onRoleChange }: ThreeRoleProps) => (
  <div
    className="grid gap-2 rounded-lg border border-zinc-200 bg-white p-1 shadow-sm md:grid-cols-2"
    role="tablist"
    aria-label="Role view"
  >
    {roleOptions.map(({ role, label }) => {
      const isActive = activeRole === role

      return (
        <button
          key={role}
          type="button"
          role="tab"
          aria-selected={isActive}
          className={[
            'inline-flex h-12 items-center justify-center rounded-md px-3 text-sm font-semibold transition',
            isActive
              ? 'bg-zinc-950 text-white shadow-sm'
              : 'text-zinc-600 hover:bg-amber-50 hover:text-zinc-950',
          ].join(' ')}
          onClick={() => onRoleChange(role)}
        >
          <span>{label}</span>
        </button>
      )
    })}
  </div>
)
