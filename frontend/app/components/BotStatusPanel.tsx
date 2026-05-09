"use client";

import type { Bot } from "../types";

export function BotStatusPanel({ bots }: { bots: Bot[] }) {
  return (
    <section className="bot-status-section">
      <h3>🤖 Active Bots</h3>
      <div className="bot-list">
        {bots.length === 0 ? (
          <div className="empty-state bot-empty">
            No bots active — click &quot;+ Bot&quot; to add one
          </div>
        ) : (
          bots.map((bot) => (
            <div key={bot.id} className={`bot-chip ${bot.status}`}>
              <span className="bot-status-dot" />
              {bot.status === "processing" && bot.order ? (
                <>
                  Bot #{bot.id} → Order #{bot.order.id}
                  <div className="bot-progress">
                    <div className="bot-progress-bar" style={{ width: `${bot.progress}%` }} />
                  </div>
                </>
              ) : (
                <>Bot #{bot.id} — IDLE</>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
