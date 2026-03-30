import { ref, onUnmounted } from 'vue'
import type { WsEvent } from '../types'
import { getWsUrl } from '../api'

/** WebSocket 连接状态 */
export type ConnectionStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED'

/**
 * WebSocket 组合式函数，支持自动重连
 * @param onMessage 收到消息时的回调
 * @param reconnectInterval 重连间隔（毫秒），默认 3000
 */
export function useWebSocket(
  onMessage: (event: WsEvent) => void,
  reconnectInterval = 3000,
) {
  const status = ref<ConnectionStatus>('DISCONNECTED')
  let ws: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let stopped = false

  function connect() {
    if (stopped) return

    // 清理旧连接
    cleanup()

    const url = getWsUrl()
    ws = new WebSocket(url)
    status.value = 'CONNECTING'

    ws.onopen = () => {
      status.value = 'CONNECTED'
      console.log('[WebSocket] 已连接')
    }

    ws.onmessage = (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data) as WsEvent
        onMessage(parsed)
      } catch (e) {
        console.error('[WebSocket] 消息解析失败:', e)
      }
    }

    ws.onclose = () => {
      status.value = 'DISCONNECTED'
      console.log('[WebSocket] 连接关闭，准备重连...')
      scheduleReconnect()
    }

    ws.onerror = (err) => {
      console.error('[WebSocket] 连接错误:', err)
      // onclose 会自动触发重连
    }
  }

  function scheduleReconnect() {
    if (stopped) return
    if (reconnectTimer) clearTimeout(reconnectTimer)
    reconnectTimer = setTimeout(() => {
      console.log('[WebSocket] 尝试重连...')
      connect()
    }, reconnectInterval)
  }

  function cleanup() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    if (ws) {
      // 防止 onclose 触发重连
      ws.onclose = null
      ws.close()
      ws = null
    }
  }

  function disconnect() {
    stopped = true
    cleanup()
    status.value = 'DISCONNECTED'
  }

  // 组件卸载时自动断开
  onUnmounted(() => {
    disconnect()
  })

  // 立即连接
  connect()

  return {
    status,
    connect,
    disconnect,
  }
}
