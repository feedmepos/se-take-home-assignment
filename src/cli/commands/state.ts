import { CommandHandler } from "./types";

export const handleState: CommandHandler = (ctx) => {
  const s = ctx.controller.getState();
  ctx.log(
    `State | PENDING vip=${s.pendingVipCount} normal=${s.pendingNormalCount} | BOTS active=${s.activeBotIds.length} busy=${s.busyBotIds.length} | COMPLETE=${s.completedCount}`
  );
};
