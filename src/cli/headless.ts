import { OrderController } from '../controller/OrderController.js';
import { log, writeText } from '../utils/logger.js';

const controller = new OrderController();

// 写入标题
writeText("McDonald's Order Management System - Simulation Results");
writeText("");
log("System initialized with 0 bots");

// 模拟测试脚本
setTimeout(() => {
  controller.createNormalOrder();
}, 1000);

setTimeout(() => {
  controller.createVipOrder();
}, 2000);

setTimeout(() => {
  controller.createNormalOrder();
}, 2500);

setTimeout(() => {
  controller.addBot();
}, 3000);

setTimeout(() => {
  controller.addBot();
}, 4000);

setTimeout(() => {
  controller.createVipOrder();
}, 15000);

setTimeout(() => {
  controller.removeBot(2);
}, 25000);

// 保持进程运行，输出最终状态
setTimeout(() => {
  const stats = controller.getStats();
  writeText("");
  writeText("Final Status:");
  writeText(`- Total Orders Processed: ${stats.totalOrders} (${stats.vipCount} VIP, ${stats.normalCount} Normal)`);
  writeText(`- Orders Completed: ${stats.totalOrders}`);
  writeText(`- Active Bots: ${stats.activeBots}`);
  writeText(`- Pending Orders: ${stats.pendingOrders}`);
  process.exit(0);
}, 30000);
