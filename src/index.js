const OrderController = require("./services/orderController");
const { log, initLog } = require("./utils/helpers");

const mcd = new OrderController();

initLog();
log("McDonald's Order Management System - Simulation Results", true);
log("", true);
mcd.botNumber();
mcd.addBot();
mcd.addOrder("NORMAL");
mcd.addOrder("VIP");
mcd.addOrder("NORMAL");
mcd.addOrder("VIP");
mcd.addBot();
mcd.addOrder("NORMAL");
mcd.removeBot();

setTimeout(() => {}, 15000);
