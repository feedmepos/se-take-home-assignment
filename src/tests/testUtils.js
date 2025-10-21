const botService = require("../services/botService.js");
const { orderService } = require("../services/orderService.js");

const setupTestEnv = () => {
  beforeEach(() => {
    // Reset everything
    orderService.pending = [];
    orderService.complete = [];
    orderService.lastOrderId = 0;
    botService.bots = [];
    botService.processing.clear();
    botService.nextBotId = 0;
  });

  afterEach(() => {
    botService.bots.forEach((bot) => botService.removeBot(bot));
    botService.bots = [];
    jest.clearAllTimers();
  });
};

module.exports = setupTestEnv;
