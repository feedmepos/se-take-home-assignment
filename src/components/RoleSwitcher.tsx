import { ROLE, type Role } from '../domain'

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: ROLE.NORMAL_CUSTOMER, label: '😊 普通顾客' },
  { value: ROLE.VIP_CUSTOMER, label: '⭐ VIP 顾客' },
  { value: ROLE.MANAGER, label: '👔 经理' },
]

export default function RoleSwitcher({ role, onChange }: { role: Role; onChange: (r: Role) => void }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-white/80">角色：</span>
      <select
        value={role}
        onChange={(e) => onChange(e.target.value as Role)}
        className="border border-white/30 rounded px-2 py-1 text-sm bg-white text-gray-900 cursor-pointer"
      >
        {ROLE_OPTIONS.map((r) => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>
    </div>
  )
}
