function createQueue() {
  const orders = [];

  function insertionIndex(type) {
    if (type === 'VIP') {
      let i = 0;
      while (i < orders.length && orders[i].type === 'VIP') i++;
      return i;
    }
    return orders.length;
  }

  return {
    enqueue(order) {
      orders.splice(insertionIndex(order.type), 0, order);
    },
    dequeue() {
      return orders.shift();
    },
    returnToQueue(order) {
      let i = 0;
      if (order.type === 'VIP') {
        while (i < orders.length && orders[i].type === 'VIP' && orders[i].id < order.id) i++;
      } else {
        while (i < orders.length && orders[i].type === 'VIP') i++;
        while (i < orders.length && orders[i].id < order.id) i++;
      }
      orders.splice(i, 0, order);
    },
    list() {
      return [...orders];
    },
    get size() {
      return orders.length;
    },
  };
}

module.exports = { createQueue };
