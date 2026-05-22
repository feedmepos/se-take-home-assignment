class bot 
{
    constructor(id) 
    {
      this.id = id;
      this.isBusy = false;
      this.currentOrder = null;
      this.timer = null;
    }

    assignOrder(order, onComplete) 
    {
      this.isBusy = true;
      this.currentOrder = order;

      this.timer = setTimeout(() => 
      {
          this.isBusy = false;
          this.currentOrder = null;
          onComplete(order);
      }, 10000);
    }

    stop() 
    {
      if (this.timer) clearTimeout(this.timer);
      return this.currentOrder; 
    }
}

module.exports = bot;
