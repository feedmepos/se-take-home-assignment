import { useState, useEffect } from 'react'
import { type Robot, type Order, padId } from '../types'

interface RobotPanelProps {
  robots: Robot[]
  pendingOrders: Order[]
}

const PROCESSING_DURATION = 10 // seconds

function CountdownBar({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const tick = () => setElapsed((Date.now() - startTime) / 1000)
    tick()
    const interval = setInterval(tick, 100)
    return () => clearInterval(interval)
  }, [startTime])

  const remaining = Math.max(0, PROCESSING_DURATION - elapsed)
  const elapsedPercent = Math.min(100, (elapsed / PROCESSING_DURATION) * 100)

  return (
    <div className="robot-countdown">
      <div className="robot-progress-bar">
        <div
          className="robot-progress-fill"
          style={{ width: `${elapsedPercent}%` }}
        />
      </div>
      <span className="robot-countdown-text">{remaining.toFixed(1)}s</span>
    </div>
  )
}

export default function RobotPanel({ robots, pendingOrders }: RobotPanelProps) {
  return (
    <div className="robot-section">
      <div className="robot-section-header">
        <h2>Processing</h2>
        <span className="robot-section-summary">
          {robots.length} Robots · Processing {robots.filter(r => r.processingOrder !== null).length}
        </span>
      </div>
      <div className="robot-section-body">
        {robots.length === 0 ? (
          <div className="robot-hint">
            {pendingOrders.length > 0
              ? `Current pending orders: ${pendingOrders.length}. Please add robots to process them.`
              : 'No robots available. Click 「+Robot」 to add one.'}
          </div>
        ) : (
          <div className="robot-cards">
            {[...robots]
              .sort((a, b) => a.id - b.id)
              .map(robot => (
                <div
                  key={robot.id}
                  className={`robot-card${robot.processingOrder ? ' robot-busy' : ' robot-idle'}`}
                >
                  <div className="robot-card-top">
                    <span className="robot-card-label">Robot {padId(robot.id)}</span>
                    {robot.processingOrder ? (
                      <span className="robot-card-status">
                        Processing{' '}
                        <span className={`order-tag${robot.processingOrder.type === 'vip' ? ' order-tag-vip' : ''}`}>
                          {robot.processingOrder.id}
                          {robot.processingOrder.type === 'vip' && (
                            <span className="tag-vip-badge">VIP</span>
                          )}
                        </span>
                      </span>
                    ) : (
                      <span className="robot-card-idle-text">Waiting for orders</span>
                    )}
                  </div>
                  {robot.processingOrder && robot.processingStartTime && (
                    <CountdownBar startTime={robot.processingStartTime} />
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
