import type { RoleTab } from '../types'
import { CustomerIcon, ManagerIcon, VipIcon } from './icons/UiIcons'

type RoleTabsProps = {
  activeTab: RoleTab
  onChange: (tab: RoleTab) => void
}

const tabStyles = (active: boolean): string =>
  `inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
    active
      ? 'bg-slate-900 text-white'
      : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
  }`

export function RoleTabs({ activeTab, onChange }: RoleTabsProps) {
  return (
    <div className="mt-5 flex flex-wrap gap-2">
      <button
        type="button"
        className={tabStyles(activeTab === 'CUSTOMER')}
        onClick={() => onChange('CUSTOMER')}
      >
        <CustomerIcon />
        Customer
      </button>
      <button
        type="button"
        className={tabStyles(activeTab === 'VIP_MEMBER')}
        onClick={() => onChange('VIP_MEMBER')}
      >
        <VipIcon className="h-4 w-4 text-amber-400" />
        VIP Member
      </button>
      <button
        type="button"
        className={tabStyles(activeTab === 'MANAGER')}
        onClick={() => onChange('MANAGER')}
      >
        <ManagerIcon className="h-4 w-4 text-emerald-500" />
        Manager
      </button>
    </div>
  )
}
