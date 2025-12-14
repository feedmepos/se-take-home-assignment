import { Worker } from "worker_threads";
import { OrderState, BotState } from "./enum/state.js";
import { OrderType } from "./enum/type.js";
import { formatBotId, formatOrderId, logger } from "./helper/formatter.js";
import { botCounter, orderCounter } from "./helper/counter.js";
import path, { resolve } from "path";
const __dirname = path.resolve(); //es6
import dotenv from "dotenv";
dotenv.config({ quiet: true });

export class Kitchen {
  constructor() {
    this.botArray = [];
    this.vipOrderQueue = [];
    this.normalOrderQueue = []; //we can merge with vipOrderQueue, but processing the array is slower than simply checking if vip arr is just empty
    this.completeOrderQueue = []; //everything complete is thrown in here
    logger(`System initialized with ${this.botArray.length} bots`);
  }

  createOrder(orderType, orderProcessTime) {
    const formedOrder = {
      orderId: formatOrderId(orderCounter.incrementOrderCounter()),
      requestTimestamp: Date.now(),
      pickupTimestamp: null,
      completeTimestamp: null,
      state: OrderState.PENDING,
      orderType: orderType,
      orderProcessTime: orderProcessTime,
    };

    if (orderType === OrderType.VIP) {
      this.vipOrderQueue.push(formedOrder);
    } else if (orderType === OrderType.NORMAL) {
      this.normalOrderQueue.push(formedOrder);
    }
    `Created formedOrder ${JSON.stringify(formedOrder)}`;
    logger(
      `Created ${formedOrder.orderType} Order #${formedOrder.orderId} - Status: ${formedOrder.state}`
    );
    this.assignOrder();
    return formedOrder;
  }

  listPendingOrders() {
    return this.vipOrderQueue.concat(this.normalOrderQueue);
  }

  listCompleteOrders() {
    return this.completeOrderQueue;
  }

  //so that we can just spin up a bunch if needed
  async buildBots(botToBuild = 1) {
    for (let i = 0; i < botToBuild; i++) {
      const bot = new Worker(path.join(__dirname, `src/bot.js`));
      //setting bots
      bot.id = formatBotId(botCounter.incrementBotCounter());
      bot.state = "IDLE";
      logger(`Bot #${bot.id} created - Status: ${bot.state}`); //if we want specialized ACTIVE message at start, we need to either set active then idle right after, OR we have special handlig for first order, not good idea imo
      bot.on("message", (result) => {
        //(if bot.Id still exists && bot.state === active)
        {
          logger(
            `Bot #${bot.id} completed ${result.orderType} Order #${result.orderId} - Status: ${result.state} (Processing time: ${result.orderProcessTime}s)`
          );
          this.completeOrderQueue.push(result);
          bot.state = "IDLE";
        }
        delete bot.order;
        if (!this.assignOrder()) {
          logger(`Bot #${bot.id} is now ${bot.state} - No pending orders`);
        }
      });
      this.botArray.push(bot);
      this.assignOrder();
    }
  }

  listBots() {
    return this.botArray;
  }

  async clearBotOrder(bot) {
    if (bot.state === BotState.ACTIVE && bot.order) {
      //we return the order and reset bot to idle
      bot.order.state = OrderState.PENDING;
      delete bot.order.pickupTimestamp;
      if (bot.order.orderType === OrderType.VIP) {
        this.vipOrderQueue.unshift(bot.order);
      }
      if (bot.order.orderType === OrderType.NORMAL) {
        this.normalOrderQueue.unshift(bot.order);
      }
      bot.state = BotState.IDLE;
      logger(
        `Re-queue ${bot.order.orderType} Order #${bot.order.orderId} - Status: ${bot.order.state}`
      );
      delete bot.order;
      this.assignOrder();
    }
  }

  async clearBotOrderAll() {
    for (let bot of this.botArray) {
      this.clearBotOrder(bot);
    }
  }

  async killBot(botId) {
    const botPos = this.botArray.map((b) => b.id).indexOf(botId);
    let botToKill = JSON.parse(JSON.stringify(this.botArray[botPos]));
    if (botPos >= 0) {
      this.botArray[botPos].terminate();
      this.botArray.splice(botPos, 1);
      logger(`Bot #${botId} destroyed while ${botToKill.state}`);
      if (botToKill.state === BotState.ACTIVE) {
        this.clearBotOrder(botToKill);
      }
    } else {
      console.error(`bot not found`);
    }
  }

  async killBotAll() {
    const botIds = this.botArray.map((bot) => bot.id);
    await Promise.all(
      botIds.map(async (id) => {
        await this.killBot(id);
      })
    );
  }

  assignOrder() {
    const idleWorker = this.botArray.find((w) => w.state === BotState.IDLE);
    if (
      idleWorker &&
      this.vipOrderQueue.length + this.normalOrderQueue.length > 0
    ) {
      let orderToProcess;
      if (this.vipOrderQueue.length > 0) {
        orderToProcess = this.vipOrderQueue.shift();
      } else {
        orderToProcess = this.normalOrderQueue.shift();
      }
      if (orderToProcess) {
        //set order/bot states to be processed
        idleWorker.state = BotState.ACTIVE;

        orderToProcess.pickupTimestamp = Date.now();
        orderToProcess.state = OrderState.PROCESSING;
        orderToProcess.botId = idleWorker.id;
        if (!orderToProcess.orderProcessTime)
          orderToProcess.orderProcessTime =
            process.env.DEFAULT_ORDER_PROCESS_TIME ?? 10;
        idleWorker.order = JSON.parse(JSON.stringify(orderToProcess));
        logger(
          `Bot #${idleWorker.id} picked up ${orderToProcess.orderType} Order #${orderToProcess.orderId} - Status: ${orderToProcess.state}`
        );
        idleWorker.postMessage(orderToProcess);
        return true;
      }
      return false;
    }
  }

  checkFinish() {
    const freeBotCount = this.botArray.filter(
      (bot) => bot.state === BotState.IDLE
    ).length;
    if (
      freeBotCount === this.botArray.length &&
      this.vipOrderQueue.length + this.normalOrderQueue.length === 0 &&
      this.completeOrderQueue.length > 0
    ) {
      //all orders done, all queues clear, bots idle
      return false;
    }
    return true;
  }

  async shutdownKitchen() {
    this.clearBotOrderAll();
    //gen report
    console.log(`\nFinal Status:`);
    console.log(
      `- Total Orders Processed: ${this.completeOrderQueue.length} (${
        this.completeOrderQueue.filter(
          (order) => order.orderType === OrderType.VIP
        ).length
      } ${OrderType.VIP}, ${
        this.completeOrderQueue.filter(
          (order) => order.orderType === OrderType.NORMAL
        ).length
      } ${OrderType.NORMAL})`
    );
    console.log(`- Orders Completed: ${this.completeOrderQueue.length}`);
    console.log(`- Active Bots: ${this.botArray.length}`);
    console.log(
      `- Pending Orders: ${vipOrderQueue.length + this.normalOrderQueue.length}`
    );
  }
}
