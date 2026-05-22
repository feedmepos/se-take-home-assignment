import { Badge } from './ui/badge'
import { WifiOff, CloudOff, RefreshCw, CheckCircle2 } from 'lucide-react'
import { useSyncManager } from '@/lib/sync-manager'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export function OfflineIndicator() {
  const { state: syncState } = useSyncManager()
  const [showSyncStatus, setShowSyncStatus] = useState(false)

  useEffect(() => {
    if (syncState.isSyncing) {
      setShowSyncStatus(true)
      const timeout = setTimeout(() => setShowSyncStatus(false), 3000)
      return () => clearTimeout(timeout)
    }
  }, [syncState.isSyncing])

  if (
    syncState.isOnline &&
    syncState.pendingOperations === 0 &&
    !showSyncStatus
  ) {
    return null
  }

  return (
    <div className="fixed top-20 right-8 z-50 flex flex-col items-end gap-3 pointer-events-none">
      {/* Offline Status */}
      {!syncState.isOnline && (
        <div className="glass shadow-2xl rounded-md px-4 py-2 flex items-center gap-3 border-destructive/20 bg-destructive/5 animate-slide-in-right">
          <div className="p-1.5 rounded-sm bg-destructive/10">
            <WifiOff className="w-3.5 h-3.5 text-destructive" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-destructive">
              Offline Mode
            </span>
            <span className="text-[9px] font-bold text-muted-foreground/60">
              Local persistence active
            </span>
          </div>
        </div>
      )}

      {/* Sync Status */}
      {(showSyncStatus || syncState.pendingOperations > 0) &&
        syncState.isOnline && (
          <div
            className={cn(
              'glass shadow-2xl rounded-md px-4 py-2 flex items-center gap-3 animate-slide-in-right transition-all duration-500',
              syncState.isSyncing
                ? 'border-blue-500/20 bg-blue-500/5'
                : 'border-emerald-500/20 bg-emerald-500/5',
            )}
          >
            <div
              className={cn(
                'p-1.5 rounded-sm',
                syncState.isSyncing
                  ? 'bg-blue-500/10 text-blue-500'
                  : 'bg-emerald-500/10 text-emerald-500',
              )}
            >
              {syncState.isSyncing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
            </div>
            <div className="flex flex-col">
              <span
                className={cn(
                  'text-[10px] font-black uppercase tracking-widest',
                  syncState.isSyncing ? 'text-blue-500' : 'text-emerald-500',
                )}
              >
                {syncState.isSyncing ? 'Data Sync' : 'Sync Complete'}
              </span>
              <span className="text-[9px] font-bold text-muted-foreground/60">
                {syncState.pendingOperations > 0
                  ? `${syncState.pendingOperations} operations pending`
                  : 'Cloud synchronized'}
              </span>
            </div>
          </div>
        )}
    </div>
  )
}
