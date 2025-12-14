let orderCount = 0;
let botCount = 0;

const orderCounterObject = {
  getOrderCounter: () => orderCount,
  incrementOrderCounter: () => ++orderCount,
};

const botCounterObject = {
  getBotCounter: () => botCount,
  incrementBotCounter: () => ++botCount,
};

const orderCounter = Object.freeze(orderCounterObject);
const botCounter = Object.freeze(botCounterObject);

export { botCounter, orderCounter };
