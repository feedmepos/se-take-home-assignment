function log(message) {
  const timestamp = new Date().toLocaleTimeString("en-GB", { hour12: false });
  const line = `[${timestamp}] ${message}\n`;
  console.log(line.trim());
}

function logFinalSummary(orderStats, botStats) {
  const summary = `
Final Status:
- Total Orders Processed: ${orderStats.totalOrders} (${orderStats.vipCount} VIP, ${orderStats.normalCount} Normal)
- Orders Completed: ${orderStats.completed}
- Active Bots: ${botStats.active}
- Pending Orders: ${orderStats.pending}
`;
  console.log(summary);
}

module.exports = { log, logFinalSummary };
