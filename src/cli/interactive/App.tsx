import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, type Key } from 'ink';
import { OrderController } from '../../controller/OrderController.js';
import { Button } from './components/Button.js';
import { OrderList } from './components/OrderList.js';
import { BotStatus } from './components/BotStatus.js';

interface AppProps {
  controller: OrderController;
}

export function App({ controller }: AppProps) {
  const [, forceUpdate] = useState({});
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    controller.setOnChange(() => {
      forceUpdate({});
    });

    // 每秒钟更新一次，显示剩余时间
    const interval = setInterval(() => {
      forceUpdate({});
    }, 1000);

    return () => clearInterval(interval);
  }, [controller]);

  useInput((input: string, key: Key) => {
    if (input === 'q' || key.escape) {
      process.exit(0);
    }

    switch (input) {
      case 'n':
        controller.createNormalOrder();
        break;
      case 'v':
        controller.createVipOrder();
        break;
      case 'a':
        controller.addBot();
        break;
      case 'r':
        const result = controller.removeBot();
        setMessage(result.message);
        setTimeout(() => setMessage(''), 3000);
        break;
    }
  });

  const pendingVip = controller.getPendingVipOrders();
  const pendingNormal = controller.getPendingNormalOrders();
  const bots = controller.getBots();
  const completed = controller.getCompletedOrders();

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="blue">McDonald's Order Controller</Text>
      </Box>

      <Box marginBottom={1} padding={1} borderStyle="round" borderColor="gray">
        <Text bold>操作说明</Text>
        <Text dimColor>Press N - Create Normal Order</Text>
        <Text dimColor>Press V - Create VIP Order</Text>
        <Text dimColor>Press A - Add Bot</Text>
        <Text dimColor>Press R - Remove Last Bot</Text>
        <Text dimColor>Press Q - Quit</Text>
      </Box>

      {message && (
        <Box marginBottom={1}>
          <Text color="red">{message}</Text>
        </Box>
      )}

      <Box marginBottom={1} gap={2}>
        <Button label="New Normal Order" hotkey="N" onSelect={() => controller.createNormalOrder()} />
        <Button label="New VIP Order" hotkey="V" onSelect={() => controller.createVipOrder()} />
        <Button label="Add Bot" hotkey="A" onSelect={() => controller.addBot()} />
        <Button label="Remove Bot" hotkey="R" onSelect={() => {
          const result = controller.removeBot();
          setMessage(result.message);
          setTimeout(() => setMessage(''), 3000);
        }} />
      </Box>

      <Box flexDirection="row" gap={4}>
        <Box flexDirection="column" width="50%">
          <OrderList title="Pending VIP Orders" orders={pendingVip} color="yellow" />
          <OrderList title="Pending Normal Orders" orders={pendingNormal} color="white" />
        </Box>
        <Box flexDirection="column" width="50%">
          <BotStatus bots={bots} getRemainingSeconds={(bot) => controller.getBotRemainingSeconds(bot)} />
          <OrderList title="Completed Orders" orders={completed} color="green" />
        </Box>
      </Box>
    </Box>
  );
}
