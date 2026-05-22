const Order = require("../models/order");
const Bot = require("../models/bot");
const { padTrio, log } = require("../utils/helpers");

class orderController 
{

    constructor(newline = true) 
    {
      this.orders = [];
      this.bots = [];
      this.completed = [];
      this.lastOrderId = 0;
      this.lastBotId = 0;
      this.hasOrders = false;
      this.newline = newline;
    }



    addOrder(type) 
    {
        const order = new Order(++this.lastOrderId, type);

        if (type === "VIP") 
        {
            const vipIndex = this.orders.findIndex(o => o.type !== "VIP");
            if (vipIndex === -1) this.orders.push(order);
            else this.orders.splice(vipIndex, 0, order);
        } 
        else 
        {
            this.orders.push(order);
        }

        if(this.newline)log("New Order "+type+"#"+padTrio(order.id)+" - Status: PENDING");
          
        this.dispatch();
    }

    botNumber() 
    {
      if(this.newline)log("System initialized with " + this.bots.length);
    }

    addBot() 
    {
        const bot = new Bot(++this.lastBotId);
        this.bots.push(bot);
        if(this.newline)log("Added Bot #" + bot.id);
        this.dispatch();
    }

    removeBot() 
    {
      if (this.bots.length === 0) return;

      const bot = this.bots.pop();
      const unfinishedOrder = bot.stop();

      if (unfinishedOrder) 
      {
        unfinishedOrder.status = "PENDING";
        if (unfinishedOrder.type === "VIP") 
        {
          const vipIndex = this.orders.findIndex(o => o.type !== "VIP");
          if (vipIndex === -1) 
          {
              this.orders.push(unfinishedOrder);
          } 
          else 
          {
              this.orders.splice(vipIndex, 0, unfinishedOrder);
          }
        } 
        else 
        {
            this.orders.push(unfinishedOrder);
        }
        if(this.newline)log("Bot #"+bot.id+" destroyed - Returning Order "+unfinishedOrder.type+"#"+padTrio(unfinishedOrder.id));
      } 
      else 
      {
        if(this.newline)log("Bot #"+bot.id+" destroyed while IDLE");
      }
      this.dispatch();
    }

    dispatch() 
    {
      let anyAssigned = false;
      for (let bot of this.bots) 
      {
        if (!bot.isBusy && this.orders.length > 0) 
        {
          const order = this.orders.shift();
          order.status = "PROCESSING";
          order.startedAt = new Date();
          this.hasOrders = true;

          if(this.newline)log("Bot #"+bot.id+" started Order "+order.type+"#"+padTrio(order.id)+" Status: "+order.status);
          anyAssigned = true;

          bot.assignOrder(order, (completed) => 
          {
            completed.status = "COMPLETED";
            completed.completedAt = new Date();

            const processingTimeMs = completed.completedAt - completed.startedAt;
            const seconds = (processingTimeMs / 1000).toFixed(2);

            this.completed.push(completed);
            if(this.newline)log("Order "+completed.type+"#"+padTrio(completed.id)+" - Status: "+completed.status + " (Processing Time: " + seconds + "s)");
            this.dispatch();
          });
        }
        if (!bot.isBusy && this.orders.length === 0)
        {
          if(this.newline)log("Bot " + bot.id + " is now IDLE - pending orders: "+this.orders.length)
        }

        if (!anyAssigned && this.hasOrders) 
        {
          const allDone = this.orders.length === 0 && this.bots.every(b => !b.isBusy);
          if (allDone) 
          {
            if(this.newline)this.assignStatus();
          }
        }
      }
    }

    assignStatus()
    {
      log("", true);
      const totalVIP = this.completed.filter(o => o.type === "VIP").length;
      const totalNormal = this.completed.filter(o => o.type === "NORMAL").length;
      const totalCompleted = this.completed.filter(o => o.status === "COMPLETED").length;
      const totalPending = this.completed.filter(o => o.status === "PENDING").length;
      log("Final Status:", true);
      log("- Total Orders Processed: "+this.completed.length+" ("+totalVIP+" VIP, "+totalNormal+" Normal)", true);
      log("- Orders Completed: "+totalCompleted, true);
      log("- Active Bots: "+this.bots.length, true);
      log("- Pending Orders: "+totalPending, true);
    }
}

module.exports = orderController;
