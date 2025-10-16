import { CommandHandler } from "./types";

export const handleAddBot: CommandHandler = (ctx) => {
  ctx.controller.addBot();
};

export const handleRemoveBot: CommandHandler = (ctx) => {
  ctx.controller.removeBot();
};
