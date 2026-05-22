class Order {
  #id;
  #type;

  constructor(type, id) {
    this.#type = type;

    if (id) {
      this.#id = id;
    }
  }

  get id() {
    return this.#id;
  }

  get type() {
    return this.#type;
  }
}

export default Order;
