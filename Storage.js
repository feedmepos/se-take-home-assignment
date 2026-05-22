class Storage {
  #newOrderId = 1;
  #pendingOrderArray = [];
  #completedOrderArray = [];
  #botArray = [];

  addBot(bot) {
    this.#botArray.push(bot);
  }

  addCompletedOrder(order) {
    this.#completedOrderArray.push(order);
  }

  addOrder(order, atIndex) {
    if (atIndex !== undefined) {
      this.#pendingOrderArray.splice(atIndex, 0, order);
    } else {
      this.#pendingOrderArray.push(order);
    }
  }

  getBot(index) {
    return this.#botArray[index];
  }

  getBotArray() {
    return this.#botArray;
  }

  getCompletedOrderArray() {
    return this.#completedOrderArray;
  }

  getNewOrderId() {
    return this.#newOrderId++;
  }

  getPendingOrderArray() {
    return this.#pendingOrderArray;
  }

  removeNewestBot() {
    return this.#botArray.pop();
  }

  setPendingOrderArray(pendingOrderArray) {
    this.#pendingOrderArray = pendingOrderArray;
  }

  updateBotOrder(index, order) {
    const bot = this.#botArray[index];
    bot.order = order;
  }

  updateBotStatus(index, status) {
    const bot = this.#botArray[index];
    bot.status = status;
  }

  updateBotTimeoutId(index, timeoutId) {
    const bot = this.#botArray[index];
    bot.timeoutId = timeoutId;
  }
}

export default Storage;
