const { BOT_STATUS } = require('../constants/statuses');

class Bot {
  constructor(id) {
    this.id = id;
    this.currentOrder = null;
    this.timer = null;
  }

  get isIdle() {
    return this.currentOrder === null;
  }

  get status() {
    return this.isIdle ? BOT_STATUS.IDLE : BOT_STATUS.ACTIVE;
  }
}

module.exports = Bot;
