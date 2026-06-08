import { Kitchen, FakeClock, OrderType } from '@feedme/core';
import { formatClockTime } from './time';
import { createEventRenderer } from './renderer';

/**
 * 运行一段脚本化演示场景并返回完整日志文本。
 *
 * 使用 FakeClock 让 10 秒处理瞬时完成(CI 无需真实等待),
 * 时间戳则由「真实基准时间 + 虚拟偏移」生成,既符合 HH:MM:SS 又语义递增。
 *
 * 场景覆盖:VIP 优先、双机器人并发、完成后接单、新增机器人、
 * 删除最新机器人导致订单按原优先级退回并被其余机器人接手。
 */
export function runSimulation(): string {
  const clock = new FakeClock();
  const kitchen = new Kitchen(clock, 1001);
  const baseWall = Date.now();
  const render = createEventRenderer();
  const lines: string[] = [];

  const stamp = (ms: number): string => formatClockTime(baseWall + ms);
  kitchen.on((event) => lines.push(render(event, stamp(event.at))));

  lines.push("McDonald's Order Management System - Simulation Results");
  lines.push('');
  lines.push(`[${stamp(clock.now())}] System initialized with 0 bots`);

  // t=0:三笔订单进入队列(VIP #1002 将排在普通 #1001 之前)
  kitchen.createOrder(OrderType.NORMAL); // #1001
  kitchen.createOrder(OrderType.VIP); // #1002
  kitchen.createOrder(OrderType.NORMAL); // #1003

  clock.advance(1000);
  kitchen.addBot(); // bot #1 → 取 VIP #1002

  clock.advance(1000);
  kitchen.addBot(); // bot #2 → 取 Normal #1001

  clock.advance(10_000); // #1002 完成→bot1 取 #1003;#1001 完成→bot2 空闲

  kitchen.createOrder(OrderType.VIP); // #1004 → bot2 取
  clock.advance(2000);
  kitchen.removeBot(); // 删最新 bot2:#1004 退回队列(保持 VIP 优先)

  clock.advance(7000); // bot1 完成 #1003 → 接手退回的 #1004
  clock.advance(10_000); // bot1 完成 #1004

  const completed = kitchen.completedOrders();
  const vip = completed.filter((o) => o.type === OrderType.VIP).length;
  const normal = completed.length - vip;

  lines.push('');
  lines.push('Final Status:');
  lines.push(`- Orders Completed: ${completed.length} (${vip} VIP, ${normal} Normal)`);
  lines.push(`- Active Bots: ${kitchen.bots.length}`);
  lines.push(`- Pending Orders: ${kitchen.pendingOrders().length}`);

  return lines.join('\n');
}
