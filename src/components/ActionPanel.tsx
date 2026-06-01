import type { Dispatch } from 'react'
import type { Action, RoleTab } from '../types'

type ActionPanelProps = {
  activeTab: RoleTab
  dispatch: Dispatch<Action>
}

export function ActionPanel({ activeTab, dispatch }: ActionPanelProps) {
  return (
    <div className="mt-4 flex flex-wrap gap-3">
      {activeTab === 'CUSTOMER' && (
        <button
          type="button"
          className="cursor-pointer rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          onClick={() => dispatch({ type: 'ADD_ORDER', orderType: 'NORMAL' })}
        >
          New Normal Order
        </button>
      )}

      {activeTab === 'VIP_MEMBER' && (
        <button
          type="button"
          className="cursor-pointer rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-400"
          onClick={() => dispatch({ type: 'ADD_ORDER', orderType: 'VIP' })}
        >
          New VIP Order
        </button>
      )}

      {activeTab === 'MANAGER' && (
        <>
          <button
            type="button"
            className="cursor-pointer rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
            onClick={() => dispatch({ type: 'ADD_BOT' })}
          >
            + Bot
          </button>
          <button
            type="button"
            className="cursor-pointer rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500"
            onClick={() => dispatch({ type: 'REMOVE_BOT' })}
          >
            - Bot
          </button>
        </>
      )}
    </div>
  )
}
