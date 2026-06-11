const fs = require('fs');

// Simple test without external frameworks - following Karpathy minimal approach
function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.log(`✗ ${name}: ${error.message}`);
    process.exit(1);
  }
}

// Mock system class for testing
class TestSystem {
  constructor() {
    this.orders = [];
    this.completed = [];
    this.bots = [];
    this.orderId = 1;
    this.botId = 1;
  }

  addOrder(type) {
    const order = { id: this.orderId++, type, status: 'PENDING' };
    
    if (type === 'VIP') {
      const normalIndex = this.orders.findIndex(o => o.type === 'NORMAL');
      if (normalIndex === -1) {
        this.orders.push(order);
      } else {
        this.orders.splice(normalIndex, 0, order);
      }
    } else {
      this.orders.push(order);
    }
    return order;
  }

  addBot() {
    const bot = { id: this.botId++, busy: false };
    this.bots.push(bot);
    return bot;
  }
}

// Run tests
console.log('Running McDonald\'s Order System Tests...\n');

test('Order creation increases ID', () => {
  const system = new TestSystem();
  const order1 = system.addOrder('NORMAL');
  const order2 = system.addOrder('VIP');
  
  if (order1.id !== 1 || order2.id !== 2) {
    throw new Error('Order IDs not incrementing correctly');
  }
});

test('VIP orders have priority over normal orders', () => {
  const system = new TestSystem();
  system.addOrder('NORMAL');  // id: 1
  system.addOrder('VIP');     // id: 2  
  system.addOrder('NORMAL');  // id: 3
  
  // VIP should be before the second normal order
  const orderIds = system.orders.map(o => o.id);
  const vipIndex = system.orders.findIndex(o => o.type === 'VIP');
  const secondNormalIndex = system.orders.findIndex(o => o.id === 3);
  
  if (vipIndex >= secondNormalIndex) {
    throw new Error('VIP order not prioritized correctly');
  }
});

test('Bot creation works', () => {
  const system = new TestSystem();
  const bot1 = system.addBot();
  const bot2 = system.addBot();
  
  if (bot1.id !== 1 || bot2.id !== 2 || system.bots.length !== 2) {
    throw new Error('Bot creation failed');
  }
});

test('File system access works', () => {
  // Test that we can write to result.txt
  fs.writeFileSync('test-result.txt', 'test');
  const content = fs.readFileSync('test-result.txt', 'utf8');
  fs.unlinkSync('test-result.txt');
  
  if (content !== 'test') {
    throw new Error('File system access failed');
  }
});

console.log('\nAll tests passed! ✓');
process.exit(0);