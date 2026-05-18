'use client';

import { useState, useEffect, useCallback } from 'react';
import { Order, Bot, OrderType } from '@/types/order';

const PROCESSING_TIME = 10000; // 10 seconds

export function useOrderManager() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [bots, setBots] = useState<Bot[]>([]);
  const [nextOrderId, setNextOrderId] = useState(1);
  const [nextBotId, setNextBotId] = useState(1);

  // Get pending orders sorted by VIP priority
  const getPendingOrders = useCallback(() => {
    return orders
      .filter(order => order.status === 'PENDING')
      .sort((a, b) => {
        // VIP orders come first, but maintain FIFO within same type
        if (a.type === 'VIP' && b.type !== 'VIP') return -1;
        if (a.type !== 'VIP' && b.type === 'VIP') return 1;
        return a.id - b.id;
      });
  }, [orders]);

  // Get completed orders
  const getCompletedOrders = useCallback(() => {
    return orders.filter(order => order.status === 'COMPLETE');
  }, [orders]);

  // Create new order
  const createOrder = useCallback((type: OrderType) => {
    const newOrder: Order = {
      id: nextOrderId,
      type,
      status: 'PENDING',
      createdAt: new Date(),
    };

    setOrders(prev => [...prev, newOrder]);
    setNextOrderId(prev => prev + 1);
  }, [nextOrderId]);

  // Add new bot
  const addBot = useCallback(() => {
    const newBot: Bot = {
      id: nextBotId,
      status: 'IDLE',
    };

    setBots(prev => [...prev, newBot]);
    setNextBotId(prev => prev + 1);
  }, [nextBotId]);

  // Remove newest bot
  const removeBot = useCallback(() => {
    setBots(prev => {
      if (prev.length === 0) return prev;
      
      const botToRemove = prev[prev.length - 1];
      
      // If bot is processing, return order to pending
      if (botToRemove.status === 'PROCESSING' && botToRemove.currentOrder) {
        setOrders(orders => orders.map(order => 
          order.id === botToRemove.currentOrder?.id 
            ? { ...order, status: 'PENDING' }
            : order
        ));
      }
      
      return prev.slice(0, -1);
    });
  }, []);

  // Assign orders to idle bots
  const assignOrdersToBots = useCallback(() => {
    const pendingOrders = getPendingOrders();
    const idleBots = bots.filter(bot => bot.status === 'IDLE');

    if (pendingOrders.length === 0 || idleBots.length === 0) return;

    // Assign orders to idle bots
    const assignments = Math.min(pendingOrders.length, idleBots.length);
    
    setBots(prevBots => {
      const updatedBots = [...prevBots];
      let orderIndex = 0;
      
      for (let i = 0; i < updatedBots.length && orderIndex < assignments; i++) {
        if (updatedBots[i].status === 'IDLE') {
          const order = pendingOrders[orderIndex];
          updatedBots[i] = {
            ...updatedBots[i],
            status: 'PROCESSING',
            currentOrder: order,
            processingStartTime: new Date(),
          };
          
          // Update order status
          setOrders(prevOrders => prevOrders.map(o => 
            o.id === order.id ? { ...o, status: 'PROCESSING' } : o
          ));
          
          orderIndex++;
        }
      }
      
      return updatedBots;
    });
  }, [bots, getPendingOrders]);

  // Complete order processing
  const completeOrderProcessing = useCallback((botId: number) => {
    setBots(prevBots => {
      const bot = prevBots.find(b => b.id === botId);
      if (!bot || !bot.currentOrder) return prevBots;

      // Move order to complete
      setOrders(prevOrders => prevOrders.map(order => 
        order.id === bot.currentOrder?.id 
          ? { ...order, status: 'COMPLETE' }
          : order
      ));

      // Reset bot to idle
      return prevBots.map(b => 
        b.id === botId 
          ? { ...b, status: 'IDLE', currentOrder: undefined, processingStartTime: undefined }
          : b
      );
    });
  }, []);

  // Handle order assignment when bots or orders change
  useEffect(() => {
    const timer = setTimeout(() => {
      assignOrdersToBots();
    }, 0);
    return () => clearTimeout(timer);
  }, [bots.length, orders.length, assignOrdersToBots]);

  // Handle order processing timers
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    bots.forEach(bot => {
      if (bot.status === 'PROCESSING' && bot.processingStartTime) {
        const elapsed = Date.now() - bot.processingStartTime.getTime();
        const remainingTime = PROCESSING_TIME - elapsed;

        if (remainingTime > 0) {
          const timer = setTimeout(() => {
            completeOrderProcessing(bot.id);
          }, remainingTime);
          timers.push(timer);
        } else {
          // Processing time already elapsed, complete immediately
          completeOrderProcessing(bot.id);
        }
      }
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [bots, completeOrderProcessing]);

  return {
    orders,
    bots,
    pendingOrders: getPendingOrders(),
    completedOrders: getCompletedOrders(),
    createOrder,
    addBot,
    removeBot,
  };
}
