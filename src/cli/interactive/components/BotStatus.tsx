import React from 'react';
import { Box, Text } from 'ink';
import type { Bot } from '../../../controller/Bot.js';
import { formatProductName, formatProductPrice } from '../../../controller/Product.js';

interface BotStatusProps {
  bots: Bot[];
  getRemainingSeconds: (bot: Bot) => number;
}

export function BotStatus({ bots, getRemainingSeconds }: BotStatusProps) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color="green">Robots</Text>
      {bots.length === 0 ? (
        <Text dimColor>  None</Text>
      ) : (
        bots.map(bot => (
          <Box key={bot.id} marginLeft={2}>
            <Text color={bot.status === 'busy' ? 'red' : 'green'}>
              Bot #{bot.id}: {bot.status.toUpperCase()}
              {bot.status === 'busy' && bot.currentOrder && (
                <Text> - Cooking: {formatProductName(bot.currentOrder.product)} {formatProductPrice(bot.currentOrder.product)} ({getRemainingSeconds(bot)}s left)</Text>
              )}
            </Text>
          </Box>
        ))
      )}
    </Box>
  );
}
