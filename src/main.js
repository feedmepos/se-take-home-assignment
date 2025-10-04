const readline = require("readline");
const OrderManager = require("./orderManager");
const BotManager = require("./botManager");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const orderManager = new OrderManager();
const botManager = new BotManager(orderManager);

console.log(`
++---------------------------------++
        McDonald's Bot System    
++---------------------------------++

Please enter below command to start:

| Command | Action               |
| ------- | -------------------- |
| normal  | Add new normal order |
| vip     | Add new VIP order    |
| +       | Add new bot          |
| -       | Remove last bot      |
| bot     | Print bot count      |
| status  | Print system status  |
| exit    | Quit the app         |
`);

rl.on("line", (input) => {
  switch (input.trim()) {
    case "normal":
      botManager.getBotCount() > 0 &&
        (orderManager.createOrder("NORMAL"),
        botManager.bots.forEach((bot) => botManager.processNext(bot)));
      break;
    case "vip":
      botManager.getBotCount() > 0 &&
        (orderManager.createOrder("VIP"),
        botManager.bots.forEach((bot) => botManager.processNext(bot)));
      break;
    case "+":
      botManager.addBot();
      break;
    case "-":
      botManager.removeBot();
      break;
    case "bot":
      botManager.getBotCount(true);
      break;
    case "status":
      orderManager.printStatus();
      break;
    case "exit":
      console.log("Exiting...");
      process.exit(0);
      break;
    default:
      console.log("Unknown command");
  }
});
