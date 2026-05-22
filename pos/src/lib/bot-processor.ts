import { botActions, botStore, type BotTimerState } from '../store/bot'

// Bot processor configuration
const BOT_PROCESSING_TIME_MS = 10000 // 10 seconds
const TIMER_TICK_INTERVAL_MS = 100 // Update every 100ms
const LEADER_HEARTBEAT_MS = 2000 // Leader heartbeat every 2 seconds

/**
 * BotProcessorService - Singleton for managing bot order processing
 *
 * Implements single-writer pattern:
 * - Only one browser tab (the leader) actively processes orders
 * - Other tabs subscribe to updates but don't mutate state
 * - Leadership is maintained via BroadcastChannel + localStorage lease
 */
class BotProcessorService {
  private static instance: BotProcessorService | null = null
  private channel: BroadcastChannel | null = null
  private leaderInterval: number | null = null
  private timerInterval: number | null = null
  private activeTimers: Map<string, number> = new Map() // botId -> timerId
  private leaderId = 'server'

  private constructor() {
    if (typeof window !== 'undefined') {
      const existingLeaderId = window.sessionStorage.getItem('feedme-leader-id')
      this.leaderId =
        existingLeaderId ||
        (window.crypto?.randomUUID?.() || `leader-${Date.now()}`)
      if (!existingLeaderId) {
        window.sessionStorage.setItem('feedme-leader-id', this.leaderId)
      }
      this.channel = new BroadcastChannel('feedme-bot-sync')
      this.setupLeaderElection()
    }
  }

  static getInstance(): BotProcessorService {
    if (!BotProcessorService.instance) {
      BotProcessorService.instance = new BotProcessorService()
    }
    return BotProcessorService.instance
  }

  /**
   * Setup leader election using localStorage lease
   * First tab to claim/refresh lease becomes leader
   */
  private setupLeaderElection() {
    const checkLeadership = () => {
      const leaderKey = 'feedme-leader-lease'
      const leaderOwnerKey = 'feedme-leader-owner'
      const now = Date.now()
      const currentLeader = localStorage.getItem(leaderKey)
      const currentOwner = localStorage.getItem(leaderOwnerKey)
      const leaseTime = currentLeader ? parseInt(currentLeader, 10) : NaN
      const leaseExpired =
        !Number.isFinite(leaseTime) ||
        leaseTime < now - LEADER_HEARTBEAT_MS * 2

      // If no leader or lease expired, become leader
      if (leaseExpired || currentOwner === this.leaderId) {
        localStorage.setItem(leaderKey, now.toString())
        localStorage.setItem(leaderOwnerKey, this.leaderId)
        botActions.setLeader(true)
        this.startProcessing()
      } else {
        botActions.setLeader(false)
        this.stopProcessing()
      }
    }

    // Check leadership periodically
    this.leaderInterval = window.setInterval(() => {
      checkLeadership()
    }, LEADER_HEARTBEAT_MS)

    // Initial check
    checkLeadership()
  }

  /**
   * Start bot processing (only leader does this)
   */
  private startProcessing() {
    if (this.timerInterval) return

    this.timerInterval = window.setInterval(() => {
      this.tickAllBots()
    }, TIMER_TICK_INTERVAL_MS)
  }

  /**
   * Stop bot processing
   */
  private stopProcessing() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
      this.timerInterval = null
    }

    // Clear all active timers
    this.activeTimers.forEach((timerId) => clearInterval(timerId))
    this.activeTimers.clear()
  }

  /**
   * Tick all active bot timers
   */
  private tickAllBots() {
    const state = botStore.state
    state.bots.forEach((botState, botId) => {
      if (botState.status === 'PROCESSING') {
        const now = Date.now()
        const deltaMs = now - botState.lastTick

        if (deltaMs > 0) {
          const newRemainingMs = Math.max(0, botState.remainingMs - deltaMs)

          if (newRemainingMs === 0) {
            // Order complete
            this.completeOrder(botId, botState.currentOrderId!)
          } else {
            // Update timer
            botActions.tickBotTimer(botId, deltaMs)
          }
        }
      }
    })
  }

  /**
   * Complete an order (bot finishes processing)
   */
  private async completeOrder(botId: string, orderId: string) {
    // Update bot to idle
    botActions.completeBotOrder(botId)

    // Broadcast completion to other tabs
    this.broadcast({
      type: 'ORDER_COMPLETE',
      botId,
      orderId,
    })

    // In a real implementation, this would call the API to update the order
    // For now, we'll emit an event that can be handled by the UI
    window.dispatchEvent(
      new CustomEvent('bot-order-complete', {
        detail: { botId, orderId },
      }),
    )
  }

  /**
   * Broadcast state change to other tabs
   */
  private broadcast(message: {
    type: string
    botId: string
    orderId?: string
    data?: any
  }) {
    this.channel?.postMessage(message)
  }

  /**
   * Start processing an order with a bot
   */
  startOrderProcessing(botId: string, orderId: string) {
    botActions.startBotTimer(botId, orderId)
    this.broadcast({
      type: 'ORDER_START',
      botId,
      orderId,
    })
  }

  /**
   * Get next order number (incrementing)
   */
  getNextOrderNumber(): number {
    const key = 'feedme-order-number'
    const current = parseInt(localStorage.getItem(key) || '0', 10)
    const next = current + 1
    localStorage.setItem(key, next.toString())
    return next
  }

  /**
   * Cleanup - remove all timers and listeners
   */
  destroy() {
    this.stopProcessing()

    if (this.leaderInterval) {
      clearInterval(this.leaderInterval)
      this.leaderInterval = null
    }

    if (this.channel) {
      this.channel.close()
      this.channel = null
    }

    // Clear leader lease
    if (botStore.state.isLeader) {
      const currentOwner = localStorage.getItem('feedme-leader-owner')
      if (!currentOwner || currentOwner === this.leaderId) {
        localStorage.removeItem('feedme-leader-lease')
        localStorage.removeItem('feedme-leader-owner')
      }
    }
  }
}

// Export singleton instance
export const botProcessor = BotProcessorService.getInstance()

// Export cleanup function for React hooks
export function cleanupBotProcessor() {
  botProcessor.destroy()
}
