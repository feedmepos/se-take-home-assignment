import { useCallback, useEffect, useRef, useState } from 'react';
import { insertToPendingQueue } from './orderUtils';
import type { Order, Robot } from './types';
import { PROCESSING_TIME_MS } from './types';

/**
 * 机器人与订单的配对关系。
 */
interface Assignment {
  robotId: number;
  orderId: number;
}

/**
 * 调度核心：while 循环，持续将 pendingIds 队首订单分配给空闲机器人，
 * 直到「没有空闲机器人」或「pending 为空」为止。
 */
function assignIdleRobots(pendingIds: number[], robots: Robot[]): {
  pendingIds: number[];
  assignments: Assignment[];
} {
  const assignments: Assignment[] = [];
  let remainingPending = [...pendingIds];
  const idleRobots = robots.filter((robot) => robot.status === 'idle');

  for (const robot of idleRobots) {
    if (remainingPending.length === 0) break;
    const orderId = remainingPending[0];
    remainingPending = remainingPending.slice(1);
    assignments.push({ robotId: robot.id, orderId });
  }

  return { pendingIds: remainingPending, assignments };
}

/**
 * 订单调度 Hook。
 *
 * 设计原则：业务操作与调度完全解耦。
 * - createOrder / addRobot / removeRobot：只修改 state，不感知调度
 * - useEffect：组件挂载后持续监听 pendingIds + robots，自动运行调度循环
 * - 定时器到期：只更新 state（订单完成、机器人释放），由 useEffect 再次调度
 */
export function useOrderSystem() {
  const [orders, setOrders] = useState<Record<number, Order>>({});
  const [pendingIds, setPendingIds] = useState<number[]>([]);
  const [completedIds, setCompletedIds] = useState<number[]>([]);
  const [robots, setRobots] = useState<Robot[]>([]);

  const nextOrderIdRef = useRef(1);
  const nextRobotIdRef = useRef(1);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const clearRobotTimer = useCallback((robotId: number) => {
    const timer = timersRef.current.get(robotId);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(robotId);
    }
  }, []);

  /**
   * 调度循环：pendingIds 或 robots 变化时自动运行。
   * 直接使用 deps 中的 pendingIds / robots，与触发本次 effect 的 state 保持一致。
   */
  useEffect(() => {
    const { pendingIds: nextPending, assignments } = assignIdleRobots(
      pendingIds,
      robots,
    );

    const newAssignments = assignments.filter(
      ({ robotId }) => !timersRef.current.has(robotId),
    );
    if (newAssignments.length === 0) return;

    const assignedOrderIds = newAssignments.map((item) => item.orderId);

    const updatedOrders = { ...orders };
    assignedOrderIds.forEach((orderId) => {
      updatedOrders[orderId] = { ...updatedOrders[orderId], status: 'processing' };
    });

    const updatedRobots = robots.map((robot) => {
      const assignment = newAssignments.find((item) => item.robotId === robot.id);
      if (!assignment) return robot;
      return {
        ...robot,
        status: 'processing' as const,
        currentOrderId: assignment.orderId,
      };
    });

    setOrders(updatedOrders);
    setPendingIds(nextPending);
    setRobots(updatedRobots);

    newAssignments.forEach(({ robotId, orderId }) => {
      const timer = setTimeout(() => {
        timersRef.current.delete(robotId);

        setOrders((prev) => ({
          ...prev,
          [orderId]: { ...prev[orderId], status: 'completed' as const },
        }));
        setRobots((prev) =>
          prev.map((robot) =>
            robot.id === robotId
              ? { ...robot, status: 'idle' as const, currentOrderId: null }
              : robot,
          ),
        );
        setCompletedIds((prev) => [...prev, orderId]);
      }, PROCESSING_TIME_MS);

      timersRef.current.set(robotId, timer);
    });
  }, [pendingIds, robots]);

  /** 组件卸载时清除所有定时器 */
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, []);

  /** 创建订单并插入 pending 队列，调度由 useEffect 自动触发 */
  const createOrder = useCallback(
    (isVip: boolean) => {
      const orderId = nextOrderIdRef.current++;
      const newOrder: Order = { id: orderId, isVip, status: 'waiting' };
      const updatedOrders = { ...orders, [orderId]: newOrder };

      setOrders((prev) => {
        if (prev[orderId]) return prev;
        return { ...prev, [orderId]: newOrder };
      });
      setPendingIds((prev) => {
        if (prev.includes(orderId)) return prev;
        return insertToPendingQueue(prev, updatedOrders, orderId);
      });
    },
    [orders],
  );

  /** 添加空闲机器人，调度由 useEffect 自动触发 */
  const addRobot = useCallback(() => {
    const robotId = nextRobotIdRef.current++;
    setRobots((prev) => [
      ...prev,
      { id: robotId, status: 'idle' as const, currentOrderId: null },
    ]);
  }, []);

  /** 移除机器人；若正在处理订单则将其退回 pending，调度由 useEffect 自动触发 */
  const removeRobot = useCallback(
    (robotId: number) => {
      const robot = robots.find((item) => item.id === robotId);
      if (!robot) return;

      clearRobotTimer(robotId);

      if (robot.status === 'processing' && robot.currentOrderId !== null) {
        const orderId = robot.currentOrderId;
        const waitingOrder: Order = { ...orders[orderId], status: 'waiting' };
        const updatedOrders = { ...orders, [orderId]: waitingOrder };

        setOrders((prev) => ({ ...prev, [orderId]: waitingOrder }));
        setPendingIds((prev) => {
          if (prev.includes(orderId)) return prev;
          return insertToPendingQueue(prev, updatedOrders, orderId);
        });
      }

      setRobots((prev) => prev.filter((item) => item.id !== robotId));
    },
    [orders, robots, clearRobotTimer],
  );

  return {
    orders,
    pendingIds,
    completedIds,
    robots,
    createOrder,
    addRobot,
    removeRobot,
  };
}
