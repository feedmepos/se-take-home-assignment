import { useState, useEffect, useCallback, useRef } from 'react';
import type { Order, Bot, OrderType } from '../types';
import { createOrder, sortOrders } from '../utils/orderUtils';

const PROCESSING_TIME_MS = 10000;

/**
 * 订单系统 Hook
 * 负责管理订单和机器人的状态及交互
 */
export const useOrderSystem = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [bots, setBots] = useState<Bot[]>([]);
  const [nextOrderId, setNextOrderId] = useState(1);
  const [nextBotId, setNextBotId] = useState(1);
  
  // 使用 ref 来追踪最新的状态，避免闭包陷阱
  const ordersRef = useRef<Order[]>([]);
  const botsRef = useRef<Bot[]>([]);
  
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);
  
  useEffect(() => {
    botsRef.current = bots;
  }, [bots]);

  /**
   * 添加新订单
   */
  const addOrder = useCallback((type: OrderType) => {
    setOrders(prev => {
      const newOrder = createOrder(nextOrderId, type);
      const updated = [...prev, newOrder];
      return sortOrders(updated);
    });
    setNextOrderId(id => id + 1);
  }, [nextOrderId]);

  /**
   * 添加机器人
   */
  const addBot = useCallback(() => {
    setBots(prev => {
      const newBot: Bot = {
        id: nextBotId,
        status: 'IDLE',
      };
      return [...prev, newBot];
    });
    setNextBotId(id => id + 1);
  }, [nextBotId]);

  /**
   * 移除指定的机器人
   */
  const removeBot = useCallback((botId: number) => {
    const now = Date.now();
    const currentBots = botsRef.current;
    
    const botToRemove = currentBots.find(b => b.id === botId);
    if (!botToRemove) return;
    
    // 更新机器人列表
    setBots(prev => prev.filter(b => b.id !== botId));

    // 如果该机器人正在处理订单，处理订单的回退逻辑
    if (botToRemove.status === 'WORKING' && botToRemove.processingOrderId) {
      const isFinished = botToRemove.endTime && now >= botToRemove.endTime;
      
      if (isFinished) {
        // 如果已经完成，将其移动到已完成列表
        const orderId = botToRemove.processingOrderId;
        setOrders(currentOrders => {
          const order = currentOrders.find(o => o.id === orderId);
          if (order) {
            setCompletedOrders(prev => [...prev, { ...order, status: 'COMPLETE' }]);
          }
          return currentOrders.filter(o => o.id !== orderId);
        });
      } else {
        // 如果未完成，重新入队
        setOrders(currentOrders => {
          const newOrders = currentOrders.map(order => 
            order.id === botToRemove.processingOrderId
              ? { ...order, status: 'PENDING', requeuedAt: now } as Order
              : order
          );
          return sortOrders(newOrders);
        });
      }
    }
  }, []);

  /**
   * 核心调度逻辑
   * 每秒运行一次，处理订单分配和完成检查
   */
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      let ordersChanged = false;
      let botsChanged = false;
      
      let currentOrders = [...ordersRef.current];
      let currentBots = [...botsRef.current];

      // 1. 检查已完成的任务
      currentBots = currentBots.map(bot => {
        if (bot.status === 'WORKING' && bot.endTime && now >= bot.endTime) {
          const orderId = bot.processingOrderId;
          // 从活跃订单中找到该订单并移动到已完成列表
          const completedOrder = currentOrders.find(o => o.id === orderId);
          if (completedOrder) {
            setCompletedOrders(prev => [...prev, { ...completedOrder, status: 'COMPLETE' }]);
            currentOrders = currentOrders.filter(o => o.id !== orderId);
          }
          
          ordersChanged = true;
          botsChanged = true;
          // 机器人变为空闲
          return { ...bot, status: 'IDLE', processingOrderId: undefined, startTime: undefined, endTime: undefined };
        }
        return bot;
      });

      // 2. 分配新任务
      let idleBotIndex = currentBots.findIndex(b => b.status === 'IDLE');
      let pendingOrderIndex = currentOrders.findIndex(o => o.status === 'PENDING');

      while (idleBotIndex !== -1 && pendingOrderIndex !== -1) {
        const bot = currentBots[idleBotIndex];
        const order = currentOrders[pendingOrderIndex];

        // 更新订单状态，并清除 requeuedAt（因为已经开始处理了）
        currentOrders[pendingOrderIndex] = { ...order, status: 'PROCESSING', requeuedAt: undefined };
        
        // 更新机器人状态
        currentBots[idleBotIndex] = {
          ...bot,
          status: 'WORKING',
          processingOrderId: order.id,
          startTime: now,
          endTime: now + PROCESSING_TIME_MS
        };

        ordersChanged = true;
        botsChanged = true;

        // 寻找下一个
        idleBotIndex = currentBots.findIndex(b => b.status === 'IDLE');
        pendingOrderIndex = currentOrders.findIndex(o => o.status === 'PENDING');
      }

      if (ordersChanged) setOrders(currentOrders);
      if (botsChanged) setBots(currentBots);

    }, 200); // 提高检查频率以获得更流畅的 UI (5fps)
    
    return () => clearInterval(timer);
  }, []);

  return {
    orders,
    completedOrders,
    bots,
    addOrder,
    addBot,
    removeBot,
  };
};
