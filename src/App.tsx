import { useState, useRef, useCallback, useEffect } from 'react'
import './App.css'
import HeaderPanel from './components/HeaderPanel'
import RobotPanel from './components/RobotPanel'

import { type Order, type Robot, padId } from './types'

function App() {
  const [pendingOrders, setPendingOrders] = useState<Order[]>([])
  const [completedOrders, setCompletedOrders] = useState<Order[]>([])
  const [robots, setRobots] = useState<Robot[]>([])

  // Refs for data that timer/event-handler chains need to access
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())
  const origIndexRef = useRef<Map<string, number>>(new Map())
  const robotIdCounterRef = useRef(0)
  const nextOrderNumberRef = useRef(1)

  // Refs mirroring latest state for cross-callback access
  const robotsRef = useRef(robots)

  // Ref for the recursive robot-processing loop (see assignOrderToRobot)
  const handleOrderCompleteRef = useRef<(robotId: number, order: Order) => void>(() => {})

  // ---- Core: assign first pending order to a specific robot ----
  const assignOrderToRobot = useCallback((robotId: number) => {
    setPendingOrders(prev => {
      if (prev.length === 0) {
        // No orders available — robot goes idle
        setRobots(prevR =>
          prevR.map(r => (r.id === robotId ? { ...r, processingOrder: null, processingStartTime: null } : r)),
        )
        return prev
      }

      const order = prev[0]
      const newPending = prev.slice(1)

      // Remember original index for potential rollback
      origIndexRef.current.set(order.id, 0)

      // Mark robot as processing
      setRobots(prevR =>
        prevR.map(r => (r.id === robotId ? { ...r, processingOrder: order, processingStartTime: Date.now() } : r)),
      )

      // Start 10-second processing timer
      const timer = setTimeout(() => {
        handleOrderCompleteRef.current(robotId, order)
      }, 10000)
      timersRef.current.set(robotId, timer)

      return newPending
    })
  }, [])

  // ---- Core: called when a robot finishes processing an order ----
  const handleOrderComplete = useCallback(
    (robotId: number, order: Order) => {
      // Guard: if the timer was already cleared (robot removed mid-processing), abort
      if (!timersRef.current.has(robotId)) return

      timersRef.current.delete(robotId)
      origIndexRef.current.delete(order.id)

      // Move order to completed
      setCompletedOrders(prev => [...prev, order])

      // Free the robot
      setRobots(prev =>
        prev.map(r => (r.id === robotId ? { ...r, processingOrder: null, processingStartTime: null } : r)),
      )

      // Continue processing loop — pick next order for this robot
      setTimeout(() => assignOrderToRobot(robotId), 0)
    },
    [assignOrderToRobot],
  )

  // Keep refs in sync so callbacks can access the latest version
  useEffect(() => {
    robotsRef.current = robots
    handleOrderCompleteRef.current = handleOrderComplete
  })

  // ---- Find the earliest idle robot and give it work ----
  // Processing is robot-driven: only robots can trigger order assignment.
  // This function is a no-op when no robots exist.
  const processIdleRobots = useCallback(() => {
    const currentRobots = robotsRef.current

    // No robots exist — nothing can be processed
    if (currentRobots.length === 0) return

    // Find earliest-created idle robot
    const idleRobots = currentRobots
      .filter(r => r.processingOrder === null)
      .sort((a, b) => a.id - b.id)

    if (idleRobots.length > 0) {
      assignOrderToRobot(idleRobots[0].id)
    }
  }, [assignOrderToRobot])

  // ---- Button: 新建普通订单 ----
  const addNormalOrder = useCallback(() => {
    const orderNum = nextOrderNumberRef.current++
    const order: Order = { id: padId(orderNum), type: 'normal' }

    // Append to pending
    setPendingOrders(prev => [...prev, order])

    // Only trigger processing if robots exist (robot-driven)
    if (robotsRef.current.length > 0) {
      setTimeout(() => processIdleRobots(), 0)
    }
  }, [processIdleRobots])

  // ---- Button: 新建VIP订单 ----
  const addVipOrder = useCallback(() => {
    const orderNum = nextOrderNumberRef.current++
    const order: Order = { id: padId(orderNum), type: 'vip' }

    // Insert after all VIPs, before all normals
    setPendingOrders(prev => {
      let vipEndIdx = 0
      for (let i = 0; i < prev.length; i++) {
        if (prev[i].type === 'vip') {
          vipEndIdx = i + 1
        } else {
          break
        }
      }
      const newPending = [...prev]
      newPending.splice(vipEndIdx, 0, order)
      return newPending
    })

    // Only trigger processing if robots exist (robot-driven)
    if (robotsRef.current.length > 0) {
      setTimeout(() => processIdleRobots(), 0)
    }
  }, [processIdleRobots])

  // ---- Button: +机器人 ----
  const addRobot = useCallback(() => {
    const robotId = ++robotIdCounterRef.current
    setRobots(prev => [...prev, { id: robotId, processingOrder: null, processingStartTime: null }])

    // New robot always tries to pick up a pending order
    setTimeout(() => processIdleRobots(), 0)
  }, [processIdleRobots])

  // ---- Button: -机器人 ----
  const removeRobot = useCallback(() => {
    setRobots(prev => {
      if (prev.length === 0) return prev

      const lastRobot = prev[prev.length - 1]
      const timer = timersRef.current.get(lastRobot.id)

      if (timer) {
        // Robot is processing — stop it
        clearTimeout(timer)
        timersRef.current.delete(lastRobot.id)

        if (lastRobot.processingOrder) {
          const order = lastRobot.processingOrder
          const origIndex = origIndexRef.current.get(order.id) ?? 0
          origIndexRef.current.delete(order.id)

          // Return order to pending at its original position
          setPendingOrders(pendingPrev => {
            if (order.type === 'vip') {
              // Place within VIP section, at original index (clamped)
              let vipCount = 0
              for (let i = 0; i < pendingPrev.length; i++) {
                if (pendingPrev[i].type === 'vip') {
                  vipCount = i + 1
                } else {
                  break
                }
              }
              const insertIdx = Math.min(origIndex, vipCount)
              const newArr = [...pendingPrev]
              newArr.splice(insertIdx, 0, order)
              return newArr
            } else {
              // Place after all VIPs, at original normal position
              let vipCount = 0
              for (let i = 0; i < pendingPrev.length; i++) {
                if (pendingPrev[i].type === 'vip') {
                  vipCount = i + 1
                } else {
                  break
                }
              }
              const insertIdx = Math.max(vipCount, Math.min(origIndex, pendingPrev.length))
              const newArr = [...pendingPrev]
              newArr.splice(insertIdx, 0, order)
              return newArr
            }
          })

          // Let other idle robots know there's a returned order (only if any remain)
          if (prev.length > 1) {
            setTimeout(() => processIdleRobots(), 0)
          }
        }
      }

      return prev.slice(0, -1)
    })
  }, [processIdleRobots])

  return (
    <div className="app-container">
      <h1>McDonald's Order Dashboard</h1>

      {/* 操作按钮 */}
      <div className="action-bar">
        <button className="btn btn-normal" onClick={addNormalOrder}>
          New Normal Order
        </button>
        <button className="btn btn-vip" onClick={addVipOrder}>
          New VIP Order
        </button>
        <button className="btn btn-add-robot" onClick={addRobot}>
          +Robot
        </button>
        <button className="btn btn-remove-robot" onClick={removeRobot} disabled={robots.length === 0}>
          -Robot
        </button>
      </div>

      {/* 顶部：待处理 / 已完成 双栏 */}
      <HeaderPanel pendingOrders={pendingOrders} completedOrders={completedOrders} />

      {/* 机器人展示区 */}
      <RobotPanel robots={robots} pendingOrders={pendingOrders} />
    </div>
  )
}

export default App
