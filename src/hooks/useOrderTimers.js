import { useEffect, useRef } from "react";
import { BOT_STATUS } from "../utils/enums";
import { ORDER_PROCESSING_TIME } from "../utils/constants";

/**
 * Custom hook to manage order completion timers
 * Handles timer setup, cleanup, and memory leak prevention
 */
export const useOrderTimers = (bots, onOrderComplete) => {
  const timersRef = useRef({});
  const onOrderCompleteRef = useRef(onOrderComplete);

  // Update ref when callback changes to avoid stale closures
  useEffect(() => {
    onOrderCompleteRef.current = onOrderComplete;
  }, [onOrderComplete]);

  useEffect(() => {
    const activeBotIds = new Set(bots.map(bot => bot.id));

    // Clean up timers for removed bots
    Object.keys(timersRef.current).forEach(botId => {
      if (!activeBotIds.has(Number(botId))) {
        clearTimeout(timersRef.current[botId]);
        delete timersRef.current[botId];
      }
    });

    // Set up timers for busy bots
    bots.forEach(bot => {
      if (bot.status === BOT_STATUS.BUSY && bot.currentOrder) {
        if (!timersRef.current[bot.id]) {
          timersRef.current[bot.id] = setTimeout(() => {
            onOrderCompleteRef.current(bot.id, bot.currentOrder);
            delete timersRef.current[bot.id];
          }, ORDER_PROCESSING_TIME);
        }
      }

      // Clear timer if bot becomes idle
      if (bot.status === BOT_STATUS.IDLE && timersRef.current[bot.id]) {
        clearTimeout(timersRef.current[bot.id]);
        delete timersRef.current[bot.id];
      }
    });

    // Cleanup all timers on unmount
    return () => {
      Object.values(timersRef.current).forEach(clearTimeout);
      timersRef.current = {};
    };
  }, [bots]);
};
