const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let orders = [];
let bots = [];

let orderId = 1;
let botId = 1;

function createOrder(type) {
  let order = {
    id: orderId,
    type: type,
    status: 'PENDING'
  };
  orderId++;

  if (type === 'VIP') {
    // If VIP order, place it in front of existing VIP orders
    let vipIndex = orders.findIndex(order => order.type === 'VIP');
    if (vipIndex === -1) {
      // If no existing VIP orders, add to end
      orders.push(order);
    } else {
      orders.splice(vipIndex, 0, order);
    }
  } else {
    // Otherwise, add to end of list
    orders.push(order);
  }

  console.log(`New ${type} order with ID ${order.id} created`);
}

function createBot() {
  let bot = {
    id: botId,
    status: 'IDLE'
  };
  botId++;

  bots.push(bot);

  console.log(`New bot with ID ${bot.id} created`);

  processOrders();
}

function destroyBot() {
  if (bots.length === 0) {
    console.log('No bots to destroy');
    return;
  }

  let bot = bots.pop();

  console.log(`Bot with ID ${bot.id} destroyed`);

  if (bot.status === 'PROCESSING') {
    let orderId = bot.orderId;
    let orderIndex = orders.findIndex(order => order.id === orderId);
    orders[orderIndex].status = 'PENDING';
  }

  processOrders();
}

function processOrders() {
  for (let i = 0; i < bots.length; i++) {
    let bot = bots[i];

    if (bot.status === 'IDLE' && orders.length > 0) {
      let order = orders.shift();
      order.status = 'PROCESSING';
      bot.status = 'PROCESSING';
      bot.orderId = order.id;

      console.log(`Bot with ID ${bot.id} started processing order with ID ${order.id}`);

      setTimeout(() => {
        console.log(`Bot with ID ${bot.id} finished processing order with ID ${order.id}`);
        bot.status = 'IDLE';
        order.status = 'COMPLETE';
        processOrders();
      }, 10000);

      // Can only process one order at a time, so break out of loop
      break;
    }
  }
}

function printOrders() {
  console.log('=== ORDERS ===');
  orders.forEach(order => {
    console.log(`ID: ${order.id} | Type: ${order.type} | Status: ${order.status}`);
  });
}

function printBots() {
  console.log('=== BOTS ===');
  bots.forEach(bot => {
    console.log(`ID: ${bot.id} | Status: ${bot.status}`);
  });
}

function promptUser() {
  rl.question('Enter command (n for new order, v for new VIP order, + for new bot, - for destroy bot, q to quit): ', (command) => {
    if (command === 'n') {
      createOrder('NORMAL');
      printOrders();
    } else if (command === 'v') {
      createOrder('VIP');
      printOrders();
    } else if (command === '+') {
      createBot();
      printBots();
    } else if (command === '-') {
      destroyBot();
      printBots();
    } else if (command === 'p') {
      printBots();
    } else if (command === 'q') {
      rl.close();
    }
    promptUser()
  });
}
promptUser()


