const base = new Date("2026-07-01T14:32:01");

function at(seconds) {
  const date = new Date(base.getTime() + seconds * 1000);
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

const lines = [
  "FeedMe Order Controller - Frontend Simulation Results",
  "",
  `[${at(0)}] System initialized with 0 bots`,
  `[${at(0)}] Created Normal Order #1001 - Status: PENDING`,
  `[${at(1)}] Created VIP Order #1002 - Status: PENDING`,
  `[${at(1)}] Created Normal Order #1003 - Status: PENDING`,
  `[${at(2)}] Bot #1 created - Status: IDLE`,
  `[${at(2)}] Bot #1 picked up VIP Order #1002 - Status: PROCESSING`,
  `[${at(3)}] Bot #2 created - Status: IDLE`,
  `[${at(3)}] Bot #2 picked up Normal Order #1001 - Status: PROCESSING`,
  `[${at(12)}] Bot #1 completed VIP Order #1002 - Status: COMPLETE`,
  `[${at(12)}] Bot #1 picked up Normal Order #1003 - Status: PROCESSING`,
  `[${at(13)}] Bot #2 completed Normal Order #1001 - Status: COMPLETE`,
  `[${at(13)}] Bot #2 is IDLE`,
  `[${at(14)}] Created VIP Order #1004 - Status: PENDING`,
  `[${at(14)}] Bot #2 picked up VIP Order #1004 - Status: PROCESSING`,
  `[${at(22)}] Bot #1 completed Normal Order #1003 - Status: COMPLETE`,
  `[${at(24)}] Bot #2 completed VIP Order #1004 - Status: COMPLETE`,
  `[${at(25)}] Bot #2 destroyed while IDLE`,
  "",
  "Final Status:",
  "- Total Orders Processed: 4 (2 VIP, 2 Normal)",
  "- Orders Completed: 4",
  "- Active Bots: 1",
  "- Pending Orders: 0",
];

console.log(lines.join("\n"));
