import React from 'react';
import { Box, Text } from 'ink';
import type { Order } from '../../../controller/Order.js';
import { formatProductName, formatProductPrice } from '../../../controller/Product.js';

interface OrderListProps {
  title: string;
  orders: Order[];
  color?: string;
}

export function OrderList({ title, orders, color = 'white' }: OrderListProps) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color={color}>{title}</Text>
      {orders.length === 0 ? (
        <Text dimColor>  None</Text>
      ) : (
        orders.map(order => (
          <Box key={order.id} marginLeft={2}>
            <Text color={order.type === 'vip' ? 'yellow' : 'white'}>
              #{order.id} [{order.type.toUpperCase()}] {formatProductName(order.product)} {formatProductPrice(order.product)}
            </Text>
          </Box>
        ))
      )}
    </Box>
  );
}
