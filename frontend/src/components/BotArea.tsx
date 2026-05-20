import React, { useEffect, useState } from 'react';
import type { Bot } from '../types';
import { Bot as BotIcon, Cpu } from 'lucide-react';

interface BotAreaProps {
  bots: Bot[];
}

export const BotArea: React.FC<BotAreaProps> = ({ bots }) => {
  // We use local state to trigger animation frames for the progress bars
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="panel">
      <div className="panel-header">
        <h2 className="panel-title">
          <Cpu size={24} className="text-purple-400" />
          COOKING BOTS
        </h2>
      </div>
      
      {bots.length === 0 ? (
        <div className="empty-state">
          <BotIcon size={48} />
          <p>No bots active. Click "+ Bot" to add one.</p>
        </div>
      ) : (
        <div className="bot-grid">
          {bots.map((bot) => {
            const isProcessing = bot.orderId !== null;
            
            // Calculate progress percentage (0 to 100)
            let progress = 0;
            if (isProcessing && bot.processingStartTime) {
              const elapsed = now - bot.processingStartTime;
              progress = Math.min(100, Math.max(0, (elapsed / 10000) * 100)); //change to percentage of 10 seconds (10000 ms)
            }

            return (
              <div key={bot.id} className={`bot-card ${isProcessing ? 'processing' : ''}`}>
                <div className="bot-header">
                  <span className="bot-id">Bot #{bot.id}</span>
                </div>
                
                <BotIcon className="bot-icon" />
                
                {isProcessing ? (
                  <>
                    <span className="bot-status active">Order #{bot.orderId}</span>
                    <div className="progress-container">
                      <div 
                        className="progress-bar" 
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </>
                ) : (
                  <span className="bot-status">IDLE</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
