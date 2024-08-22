//Copyright [2024] [Yong Jia Jun]

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//     http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.



//Variables
//Class Order is for order, It consist of two type which is VIP order or Normal Order and is set to have 10 sec of proccess time each order.
//Class Bot is for bot, It consist of order processing function and stop process function when it gets deleted by the user.
//Class Mcdonald refers to the user, it consist of menu display,add bot, remove bot, showing status,adding order and exit function.
//Handling user input and prompt is also included in class mcdonald



//This is for reading user input 
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});


//Class For Order
class Order {
  static idCounter = 1;

// 'VIP' or 'Normal' Order and put the created order into pending in its natural behaviour
  constructor(type) {
      this.id = Order.idCounter++;
      this.type = type;
      this.status = 'PENDING';
      this.remainingTime = 10000;
  }

  complete() {
      this.status = 'COMPLETE';
  }
}



//Class For Bot
class Bot {
  constructor(id) {
      this.id = id; // id for the bot
      this.isIdle = true; // Created bot is idle by default
      this.currentOrder = null; // The order handle by the bot
      this.timeoutId = null;  // Track the timeout ID for stopping the process
      this.startTime = null;  // this states the starttime for order
    }

  //function of bot processing order
  processOrder(order, completeCallback) {
      this.isIdle = false;
      this.currentOrder = order;
      console.log(`\nBot ${this.id} started processing order ${order.id} (${order.type})\n`);

      this.startTime = Date.now();
        this.timeoutId = setTimeout(() => {
            order.complete();
            console.log(`Bot ${this.id} completed order ${order.id}`);
            this.isIdle = true;
            this.currentOrder = null;
            this.timeoutId = null;
            this.startTime = null;
            completeCallback();
        }, order.remainingTime);
    }

  //function to  pause the bot if the bot gets deleted in processing order
  stopProcessing() {
    if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        const elapsedTime = Date.now() - this.startTime;
        this.currentOrder.remainingTime -= elapsedTime;
        console.log(`\n Bot ${this.id} stopped processing order ${this.currentOrder.id} with ${this.currentOrder.remainingTime / 1000} seconds remaining\n`);
        const interruptedOrder = this.currentOrder;
        this.isIdle = true;
        this.currentOrder = null;
        this.timeoutId = null;
        this.startTime = null;
        return interruptedOrder;
    }
    return null;
}
}



//Mcdonalds Class
class McDonalds {
  constructor() {
      this.orders = [];
      this.bots = [];
  }

  addOrder(type) {
      const order = new Order(type);
      if (type === 'VIP') {
          const normalOrderIndex = this.orders.findIndex(order => order.type === 'Normal');
          if (normalOrderIndex === -1) {
              this.orders.push(order);
          } else {
              this.orders.splice(normalOrderIndex, 0, order);
          }
      } else {
          this.orders.push(order);
      }

      console.log(`\n  New ${type} Order added: ${order.id}\n`);
      this.processOrders();
  }

  addBot() {
      const bot = new Bot(this.bots.length + 1);
      this.bots.push(bot);
      console.log(`\n Bot ${bot.id} added\n`);
      this.processOrders();
  }

  removeBot() {
      const bot = this.bots.pop();
      if (bot) {
          const interruptedOrder = bot.stopProcessing();  // Stop processing if the bot is active
          if (interruptedOrder) {
              this.orders.unshift(interruptedOrder);  // Return the order to the front of the queue
              console.log(`\n Order ${interruptedOrder.id} returned to PENDING area.\n`);
          }
          console.log(`\n  Bot ${bot.id} removed\n`);
          console.log("\n\n  Press any key to return to the main menu...");
          process.stdin.setRawMode(true);
          process.stdin.resume();
          process.stdin.once('data', () => {
              process.stdin.setRawMode(false);
              this.promptUser();
          });
      } else {
          console.log("\n  No bot to remove\n");
          console.log("\n\n   Press any key to return to the main menu...");
          process.stdin.setRawMode(true);
          process.stdin.resume();
          process.stdin.once('data', () => {
              process.stdin.setRawMode(false);
              this.promptUser();
          });
      }
  }

  processOrders() {
      for (const bot of this.bots) {
          if (bot.isIdle && this.orders.length > 0) {
              const order = this.orders.shift();
              bot.processOrder(order, () => this.processOrders());
          }
      }
  }

  showStatus() {
      console.log("\n\n             ----- Current Status -----");
      console.log("             |  Pending Orders: ", this.orders.map(order => `#${order.id} (${order.type})`).join(", ") || "None");
      console.log("             |  Idle Bots: ", this.bots.filter(bot => bot.isIdle).length,"       |");
      console.log("             |  Processing Bots: ", this.bots.filter(bot => !bot.isIdle).length," |");
      console.log("             -------------------------\n");
      console.log("\n\n            Press any key to return to the main menu...");
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.once('data', () => {
          process.stdin.setRawMode(false);
          this.promptUser();
      });
    }

  displayMenu() {
      console.clear();
      console.log(" ");
      console.log("                                      |--------------------------------------|");
      console.log("                                      |    McDonald's Food Ordering System   |");
      console.log("                                      |--------------------------------------|");
      console.log("                                      | 1. Add Normal Order                  |");
      console.log("                                      | 2. Add VIP Order                     |");
      console.log("                                      | 3. Add Bot                           |");
      console.log("                                      | 4. Remove Bot                        |");
      console.log("                                      | 5. Show Status                       |");
      console.log("                                      | 6. Exit                              |");
      console.log("                                      |--------------------------------------|\n\n");
  }

  handleUserInput(command) {
      switch(command.trim()) {
          case '1':
              this.addOrder('Normal');
              break;
          case '2':
              this.addOrder('VIP');
              break;
          case '3':
              this.addBot();
              break;
          case '4':
              this.removeBot();
              return;
          case '5':
              this.showStatus();
              return;
          case '6':
              rl.close();
              console.log("          \n        Exiting...\n\n");
              return;
          default:
              console.log("\n             Invalid selection. Please try again.");
      }
      setTimeout(() => this.promptUser(), 1000);
  }

  promptUser() {
      this.displayMenu();
      rl.question("             Select an option (Type the number): ", (command) => {
          this.handleUserInput(command);
      });
  }
}





//running environment
const mcDonalds = new McDonalds();
mcDonalds.promptUser(); // Start the command loop
