import React, { useRef, useLayoutEffect, useState } from 'react'

function BotChar({ bot, pos }) {
  const isWorking = bot.status === 'working'
  return (
    <div
      className={`bot ${isWorking ? 'bwork' : 'bidle'}`}
      style={{ left: pos.x, top: pos.y }}
    >
      {/* hat */}
      <div className="bhat">
        <div className="bhat-puff" />
        <div className="bhat-band">
          <div className="bhat-stripe" style={{ background: bot.color }} />
        </div>
      </div>

      {/* head */}
      <div className="bhead" style={{ background: bot.color }}>{bot.face}</div>

      {/* body */}
      <div className="bbody" style={{ background: bot.color }}>
        <div className="bapron" />
      </div>

      {/* legs */}
      <div className="blegs">
        <div className="bleg" />
        <div className="bleg" />
      </div>

      {/* name */}
      <div className="bname" style={{ color: bot.color }}>{bot.name}</div>

      {/* steam when working */}
      {isWorking && (
        <div className="bsteam">
          <div className="sdot" /><div className="sdot" /><div className="sdot" />
        </div>
      )}

      {/* ticket when working */}
      {isWorking && bot.orderId && (
        <div className="bticket" style={{ borderColor: bot.color, color: bot.color }}>
          #{bot.orderId}
        </div>
      )}
    </div>
  )
}

const STN_CONFIGS = [
  { ico: '🔥', lbl: 'Grill',  glow: '#ff6b35' },
  { ico: '🍟', lbl: 'Fryer',  glow: '#f6c90e' },
  { ico: '🥤', lbl: 'Drinks', glow: '#38bdf8'  },
  { ico: '📦', lbl: 'Pack',   glow: '#c084fc'  },
]

export default function Kitchen({ bots, orders }) {
  const kitchenRef = useRef(null)
  const stnRefs    = [useRef(null), useRef(null), useRef(null), useRef(null)]
  const [positions, setPositions] = useState({})

  useLayoutEffect(() => {
    const kEl = kitchenRef.current
    if (!kEl || !kEl.offsetWidth) return

    const kw = kEl.offsetWidth
    const kh = kEl.offsetHeight
    const newPos = {}

    // ── Idle bots: spread evenly across the kitchen floor ──────────────
    const idleBots = bots.filter(b => b.status === 'idle')
    idleBots.forEach((bot, ii) => {
      const n    = idleBots.length
      const xFrac = n <= 1 ? 0.48 : 0.10 + (ii / (n - 1)) * 0.78
      const yFrac = ii % 2 === 0 ? 0.64 : 0.71   // alternate rows for depth
      newPos[bot.id] = {
        x: kw * xFrac - 31,
        y: kh * yFrac - 52,
      }
    })

    // ── Working bots: group by station, stand side-by-side if shared ────
    const stationGroups = {}   // stnIdx → [bot, ...]
    bots.forEach((bot, i) => {
      if (bot.status !== 'working') return
      const si = i % 4
      ;(stationGroups[si] = stationGroups[si] || []).push(bot)
    })

    Object.entries(stationGroups).forEach(([si, grp]) => {
      const sEl = stnRefs[+si].current
      if (!sEl) return
      const sr  = sEl.getBoundingClientRect()
      const kr  = kEl.getBoundingClientRect()
      const cx  = sr.left - kr.left + sr.width / 2 - 31
      const y   = sr.bottom - kr.top + 6

      grp.forEach((bot, gi) => {
        // Centre the group under the station, 66 px between bots
        const xOff = (gi - (grp.length - 1) / 2) * 66
        newPos[bot.id] = { x: cx + xOff, y }
      })
    })

    setPositions(newPos)
  }, [bots])

  return (
    <div className="kitchen" ref={kitchenRef}>
      {/* Top counter */}
      <div className="ktopbar">
        {STN_CONFIGS.map(({ ico, lbl, glow }, i) => (
          <div className="stn" key={lbl} ref={stnRefs[i]}>
            <div className="stn-ico">{ico}</div>
            <div className="stn-lbl">{lbl}</div>
            <div className="stn-glow" style={{ background: glow }} />
          </div>
        ))}
      </div>

      {/* Serving bar */}
      <div className="kbot">
        <div className="kbot-lbl">⬆&nbsp;&nbsp;Serving Window&nbsp;&nbsp;⬆</div>
      </div>

      {/* Empty hint */}
      {bots.length === 0 && (
        <div className="ehint">
          厨房空空如也<br />
          点 🤖 +Bot 召唤厨师
        </div>
      )}

      {/* Bots */}
      {bots.map(bot => {
        const pos = positions[bot.id]
        if (!pos) return null
        return <BotChar key={bot.id} bot={bot} pos={pos} />
      })}
    </div>
  )
}
