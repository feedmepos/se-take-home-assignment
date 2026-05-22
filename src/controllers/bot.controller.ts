import { Request, Response } from "express";
import { BotService } from "../services/bot.service";

export class BotController {
  constructor(private botService: BotService) {}

  addBot = (req: Request, res: Response): void => {
    try {
      const bot = this.botService.addBot();
      res.status(201).json({
        success: true,
        message: "Bot added",
        data: bot,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to add bot",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  removeBot = (req: Request, res: Response): void => {
    try {
      const bot = this.botService.removeBot();
      if (bot) {
        res.status(200).json({
          success: true,
          message: "Bot removed",
          data: bot,
        });
      } else {
        res.status(404).json({
          success: false,
          message: "No bots available to remove",
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to remove bot",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  getAllBots = (req: Request, res: Response): void => {
    try {
      const bots = this.botService.getBots();
      res.status(200).json({
        success: true,
        data: {
          bots,
          count: bots.length,
          active: this.botService.getActiveBotCount(),
          idle: this.botService.getIdleBotCount(),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve bots",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
}
