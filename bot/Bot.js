import BotStatus from "./BotStatus.js";

class Bot {
  #order;
  #status = BotStatus.IDLE;
  #timeoutId;

  get order() {
    return this.#order;
  }

  get status() {
    return this.#status;
  }

  get timeoutId() {
    return this.#timeoutId;
  }

  set order(order) {
    this.#order = order;
  }

  set status(status) {
    this.#status = status;
  }

  set timeoutId(timeoutId) {
    this.#timeoutId = timeoutId;
  }
}

export default Bot;
