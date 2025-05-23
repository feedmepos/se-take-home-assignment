import { useState, useCallback, useEffect } from 'react';
// import { createOrder, updateOrder, createBot, deleteBot } from '@/service/useOrderSystem';
import { OrderStatus, OrderType, BotStatus } from '../constants';
import { Order, Bot } from '../types';
const PROCESSING_TIME = 10000; // 10秒处理时间
const useOrderSystem = () => {
  // 状态管理
  const [orders, setOrders] = useState<Order[]>([]); // 订单
  const [bots, setBots] = useState<Bot[]>([]); // 机器人
  // 抽象 ID 生成逻辑
  // const generateNewId = useCallback((items: Array<{ id: number }>) => 
  //   items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1
  // , []);

  // // 创建普通订单
  // const createNormalOrder = useCallback(async() => {
  //   // 调用创建普通订单API
  //   const newId = generateNewId(orders);
  //   try {
  //     const rs = await createOrder({ id: newId, type: OrderType.NORMAL, status: OrderStatus.PENDING });
  //     if(rs){
  //       setOrders(prevOrders => {
  //         return [
  //           ...prevOrders,
  //           {...rs}
  //         ];
  //       });
  //     }
  //   } catch (error) {
  //     // 弹框提示创建失败
  //   }
  // }, [orders]);

  // 更新处理中机器人的倒计时
  const updateBotsCountdown = useCallback(() => {
    setBots(prevBots =>
      prevBots.map(bot => {
        if (bot.status !== BotStatus.PROCESSING || !bot?.count) {
          return bot;
        }
        return {
          ...bot,
          count: bot?.count ? bot?.count - 1 : 0
        };
      })
    );
  }, []);
  // 添加倒计时更新的定时器
  useEffect(() => {
    // 每秒更新一次倒计时
    const countdownInterval = setInterval(updateBotsCountdown, 1000);

    return () => {
      clearInterval(countdownInterval);
    };
  }, [updateBotsCountdown]);

  // 创建普通订单
  const createNormalOrder = useCallback(() => {
    setOrders(prevOrders => {
      const newId = prevOrders.length > 0
        ? Math.max(...prevOrders.map(o => o.id)) + 1
        : 1;
      return [
        ...prevOrders,
        {
          id: newId, // 基于最新状态生成ID
          type: OrderType.NORMAL,
          status: OrderStatus.PENDING,
          createdAt: new Date(),
        }
      ];
    });
  }, []);

  // 创建VIP订单
  const createVipOrder = useCallback(() => {
    setOrders(prevOrders => {
      const newId = prevOrders.length > 0
        ? Math.max(...prevOrders.map(o => o.id)) + 1
        : 1;

      const newOrder = {
        id: newId, // 基于最新状态生成ID
        type: OrderType.VIP,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
      };

      const pendingOrders = prevOrders.filter(order => order.status === OrderStatus.PENDING);
      const firstNormalIndex = pendingOrders.findIndex(order => order.type === OrderType.NORMAL);

      // 如果不存在普通订单，直接追加到全部订单末尾
      if (firstNormalIndex === -1) return [...prevOrders, newOrder];

      // 在原始数组中定位第一个普通订单
      const targetOrder = pendingOrders[firstNormalIndex];
      const insertIndex = prevOrders.findIndex(order => order.id === targetOrder.id);

      return [
        ...prevOrders.slice(0, insertIndex), // 保留插入位置前的所有订单
        newOrder, // 插入新的VIP订单到普通订单前
        ...prevOrders.slice(insertIndex) // 追加原数组中从插入位置开始的所有订单
      ];
    });
  }, []);

  // 添加机器人（修复版）
  const addBot = useCallback(() => {
    setBots(prevBots => {
      const newId = prevBots.length > 0
        ? Math.max(...prevBots.map(b => b.id)) + 1 // 当存在机器人时：取最大ID+1
        : 1; // 首个机器人默认ID=1
      return [
        ...prevBots,
        {
          id: newId, // 基于当前bots列表生成新ID
          status: BotStatus.IDLE,
          currentOrder: null,
          timeoutId: null,
        }
      ];
    });
  }, []);

  // 移除机器人
  const removeBot = useCallback(() => {
    setBots(prevBots => {
      // 如果没有机器人，直接返回原数组(原数组为[])
      if (prevBots.length === 0) return prevBots;
      // 确定要移除的是最后一个机器人
      const botToRemove = prevBots[prevBots.length - 1];

      // 清除超时并更新订单状态
      if (botToRemove.status === BotStatus.PROCESSING && botToRemove.currentOrder) { // 确认机器人是否在处理订单
        if (botToRemove.timeoutId) {
          clearTimeout(botToRemove.timeoutId); // 防止订单完成后仍触发完成操作
        }
        // 更新订单状态,将关联的订单状态重置为PENDING，使其可以被重新分配
        setOrders(prevOrders =>
          prevOrders.map(order =>
            order.id === botToRemove?.currentOrder?.id
              ? { ...order, status: OrderStatus.PENDING }
              : order
          )
        );
      }
      // 返回新数组,移除最后一个元素，实现机器人移除
      return prevBots.slice(0, -1);
    });
  }, []);

  // 处理订单完成
  const handleOrderComplete = useCallback((botId: number, orderId: number) => {
    // 更新订单状态为已完成
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId
          ? { ...order, status: OrderStatus.COMPLETED }
          : order
      )
    );

    // 更新机器人状态为空闲
    setBots(prevBots =>
      prevBots.map(bot =>
        bot.id === botId
          ? { ...bot, status: BotStatus.IDLE, currentOrder: null, timeoutId: null, count: 0 }
          : bot
      )
    );
  }, []);

  // 分配订单给机器人，更新订单状态和机器人状态
  const assignOrderToBot = useCallback((bot: Bot, order: Order) => {
    // 更新订单状态为处理中
    setOrders(prevOrders =>
      prevOrders.map(o =>
        o.id === order.id
          ? { ...o, status: OrderStatus.PROCESSING }
          : o
      )
    );

    // 更新机器人状态
    const timeoutId = setTimeout(() => {
      handleOrderComplete(bot.id, order.id);
    }, PROCESSING_TIME); // 10秒后完成。setTimeout() 返回的是一个表示定时器ID的整数

    setBots(prevBots =>
      prevBots.map(b =>
        b.id === bot.id
          ? {
            ...b,
            status: BotStatus.PROCESSING,
            currentOrder: order,
            timeoutId: timeoutId, // setTimeout的定时器ID被保存在机器人状态中，这样在移除机器人时可以清除定时器，避免内存泄漏
            count: 10, // 10秒倒计时
          }
          : b
      )
    );
  }, [handleOrderComplete]); // 如果handleOrderComplete变化，这个useCallback函数需要重新创建

  // 处理订单分配
  useEffect(() => {
    // 找到所有空闲的机器人
    const idleBots = bots.filter(bot => bot.status === BotStatus.IDLE);
    if (idleBots.length === 0) return;

    // 找到所有待处理的订单，按优先级排序（VIP优先）
    const pendingOrders = orders
      .filter(order => order.status === OrderStatus.PENDING)
      .sort((a, b) => {
        // VIP订单优先
        if (a.type === OrderType.VIP && b.type !== OrderType.VIP) return -1; // 顺序: b,a
        if (a.type !== OrderType.VIP && b.type === OrderType.VIP) return 1;  // 顺序: a,b
        // 同类型订单按创建时间排序
        return (a?.createdAt?.getTime() || 0) - (b?.createdAt?.getTime() || 0);
      });

    if (pendingOrders.length === 0) return;

    // 为每个空闲机器人分配订单
    idleBots.forEach((bot, index) => {
      if (index < pendingOrders.length) {
        // 通过索引保证每个机器人只分配一个订单
        assignOrderToBot(bot, pendingOrders[index]);
      }
    });
  }, [orders, bots, assignOrderToBot]);

  // 获取不同状态的订单
  const getPendingOrders = useCallback(() =>
    orders.filter(order => order.status === OrderStatus.PENDING),
    [orders]);

  const getProcessingOrders = useCallback(() =>
    orders.filter(order => order.status === OrderStatus.PROCESSING),
    [orders]);

  const getCompletedOrders = useCallback(() =>
    orders.filter(order => order.status === OrderStatus.COMPLETED),
    [orders]);

  return {
    // 状态
    orders,
    bots,
    // 操作
    createNormalOrder,
    createVipOrder,
    addBot,
    removeBot,
    // 查询
    getPendingOrders,
    getProcessingOrders,
    getCompletedOrders,
  };
};

export default useOrderSystem;