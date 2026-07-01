'use strict';

const BotStatus = Object.freeze({ IDLE: 'IDLE', PROCESSING: 'PROCESSING' });

class Bot {
  constructor(id) {
    this.id = id;
    this.status = BotStatus.IDLE;
    this.currentOrder = null;
    this.timer = null;
  }
}

module.exports = { Bot, BotStatus };
