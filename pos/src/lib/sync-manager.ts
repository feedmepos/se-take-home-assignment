import { offlineDb, type SyncOperation } from '../db/offline'
import { useEffect, useState } from 'react'

// Sync manager state
interface SyncState {
  isOnline: boolean
  isSyncing: boolean
  pendingOperations: number
  lastSyncTime: number | null
}

// Sync state store (simple pub/sub for now)
const syncState: SyncState = {
  isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
  isSyncing: false,
  pendingOperations: 0,
  lastSyncTime: null,
}

// Event listeners for sync state changes
const syncListeners: Set<(state: SyncState) => void> = new Set()

function notifyListeners() {
  syncListeners.forEach((listener) => listener({ ...syncState }))
}

/**
 * SyncManager - Handles offline-to-online synchronization
 *
 * Features:
 * - Detects online/offline status
 * - Queues operations when offline
 * - Processes sync queue when online
 * - Exponential backoff for failed syncs
 */
export class SyncManager {
  private static instance: SyncManager | null = null
  private syncInterval: number | null = null
  private isProcessing = false

  private constructor() {
    this.setupEventListeners()
    this.startSyncLoop()
  }

  static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager()
    }
    return SyncManager.instance
  }

  /**
   * Setup online/offline event listeners
   */
  private setupEventListeners() {
    if (typeof window === 'undefined') return

    window.addEventListener('online', () => {
      syncState.isOnline = true
      notifyListeners()
      this.processSyncQueue()
    })

    window.addEventListener('offline', () => {
      syncState.isOnline = false
      notifyListeners()
    })

    // Initial state
    syncState.isOnline = navigator.onLine
  }

  /**
   * Start periodic sync loop (every 30 seconds when online)
   */
  private startSyncLoop() {
    if (typeof window === 'undefined') return

    this.syncInterval = window.setInterval(() => {
      if (syncState.isOnline && !this.isProcessing) {
        this.updatePendingCount()
        if (syncState.pendingOperations > 0) {
          this.processSyncQueue()
        }
      }
    }, 30000)

    // Initial check
    this.updatePendingCount()
  }

  /**
   * Update pending operations count
   */
  private async updatePendingCount() {
    const operations = await offlineDb.getPendingSyncOperations()
    syncState.pendingOperations = operations.length
    notifyListeners()
  }

  /**
   * Process sync queue
   */
  private async processSyncQueue() {
    if (!syncState.isOnline || this.isProcessing) return

    this.isProcessing = true
    syncState.isSyncing = true
    notifyListeners()

    try {
      const operations = await offlineDb.getPendingSyncOperations()

      for (const operation of operations) {
        try {
          await this.syncOperation(operation)

          // Remove from queue on success
          if (operation.id) {
            await offlineDb.removeSyncOperation(operation.id)
          }
        } catch (error) {
          // Increment retry count with exponential backoff
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          const retryCount = operation.retryCount + 1

          // Max retries: 10 (with exponential backoff, this is ~17 hours max)
          if (retryCount < 10) {
            if (operation.id) {
              await offlineDb.incrementSyncRetry(operation.id, errorMessage)
            }
          } else {
            // Give up, remove from queue
            if (operation.id) {
              await offlineDb.removeSyncOperation(operation.id)
            }
            console.error('Sync operation failed after max retries:', operation)
          }
        }
      }

      syncState.lastSyncTime = Date.now()
      await this.updatePendingCount()
    } finally {
      this.isProcessing = false
      syncState.isSyncing = false
      notifyListeners()
    }
  }

  /**
   * Sync a single operation to the server
   */
  private async syncOperation(operation: SyncOperation): Promise<void> {
    const { type, entity, payload } = operation

    // Calculate delay with exponential backoff
    const delayMs = Math.min(1000 * 2 ** operation.retryCount, 60000) // Max 1 minute
    await new Promise((resolve) => setTimeout(resolve, delayMs))

    // Sync based on entity type
    switch (entity) {
      case 'order':
        await this.syncOrder(type, payload)
        break
      case 'bot':
        await this.syncBot(type, payload)
        break
      default:
        throw new Error(`Unknown entity type: ${entity}`)
    }

    // Mark local record as synced
    await this.markAsSynced(entity, payload.uuid)
  }

  /**
   * Sync order operation
   */
  private async syncOrder(type: string, payload: any): Promise<void> {
    const endpoint = type === 'CREATE' ? '/api/orders' : `/api/orders/${payload.uuid}`
    const method = type === 'CREATE' ? 'POST' : type === 'UPDATE' ? 'PATCH' : 'DELETE'

    const response = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: type !== 'DELETE' ? JSON.stringify(payload) : undefined,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
  }

  /**
   * Sync bot operation
   */
  private async syncBot(type: string, payload: any): Promise<void> {
    const endpoint = type === 'CREATE' ? '/api/bots' : `/api/bots/${payload.uuid}`
    const method = type === 'CREATE' ? 'POST' : type === 'UPDATE' ? 'PATCH' : 'DELETE'

    const response = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: type !== 'DELETE' ? JSON.stringify(payload) : undefined,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
  }

  /**
   * Mark local record as synced
   */
  private async markAsSynced(entity: string, uuid: string): Promise<void> {
    if (entity === 'order') {
      await offlineDb.updateOrder(uuid, { synced: true })
    } else if (entity === 'bot') {
      await offlineDb.updateBot(uuid, { synced: true })
    }
  }

  /**
   * Subscribe to sync state changes
   */
  subscribe(listener: (state: SyncState) => void) {
    syncListeners.add(listener)
    // Immediately call with current state
    listener({ ...syncState })

    // Return unsubscribe function
    return () => {
      syncListeners.delete(listener)
    }
  }

  /**
   * Get current sync state
   */
  getState(): SyncState {
    return { ...syncState }
  }

  /**
   * Trigger manual sync
   */
  async triggerSync() {
    if (syncState.isOnline) {
      await this.processSyncQueue()
    }
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
    syncListeners.clear()
  }
}

// Export singleton instance
export const syncManager = SyncManager.getInstance()

// Export hook for React
export function useSyncManager() {
  const [state, setState] = useState<SyncState>(syncManager.getState())

  useEffect(() => {
    const unsubscribe = syncManager.subscribe(setState)
    return unsubscribe
  }, [])

  return {
    state,
    triggerSync: () => syncManager.triggerSync(),
  }
}
