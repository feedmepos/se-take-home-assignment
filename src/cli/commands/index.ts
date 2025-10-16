import { CommandContext, CommandHandler } from "./types";
import { handleOrder } from "./order";
import { handleAddBot, handleRemoveBot } from "./bots";
import { handleState } from "./state";
import { Constants } from "../../constants/commands";

export const registry: Record<string, CommandHandler> = {
  [Constants.CMD_STATE]: handleState,
  [Constants.CMD_ADD_BOT]: handleAddBot,
  [Constants.CMD_REMOVE_BOT]: handleRemoveBot,
  [Constants.CMD_NORMAL]: handleOrder,
  [Constants.CMD_VIP]: handleOrder,
  add: (ctx, parts) => {
    if (parts[1] === "bot") return handleAddBot(ctx, parts);
    ctx.log("Usage: add bot");
  },
  remove: (ctx, parts) => {
    if (parts[1] === "bot") return handleRemoveBot(ctx, parts);
    ctx.log("Usage: remove bot");
  },
  [Constants.CMD_HELP]: (ctx) => {
    ctx.log(Constants.HELP_TEXT);
  },
};

export function executeCommand(ctx: CommandContext, input: string): void {
  const parts = input.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return;
  const cmd = parts[0];
  if (cmd === Constants.CMD_QUIT || cmd === Constants.CMD_EXIT) {
    const s = ctx.controller.getState();
    ctx.log(
      `Final state | PENDING vip=${s.pendingVipCount} normal=${s.pendingNormalCount} | BOTS active=${s.activeBotIds.length} busy=${s.busyBotIds.length} | COMPLETE=${s.completedCount}`
    );
    // eslint-disable-next-line no-process-exit
    setTimeout(() => process.exit(0), 200);
    return;
  }
  const handler = registry[cmd];
  if (!handler) {
    ctx.log("Unknown command. Type 'help'.");
    return;
  }
  void handler(ctx, parts);
}
