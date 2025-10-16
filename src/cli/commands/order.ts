import { CommandHandler } from "./types";
import { Constants } from "../../constants/commands";

export const handleOrder: CommandHandler = (ctx, parts) => {
  const [cmd, second] = parts;
  if (cmd === Constants.CMD_NORMAL && second === Constants.CMD_ORDER) {
    ctx.controller.createNormalOrder();
    return;
  }
  if (cmd === Constants.CMD_VIP && second === Constants.CMD_ORDER) {
    ctx.controller.createVipOrder();
    return;
  }
  ctx.log("Usage: normal order | vip order");
};
