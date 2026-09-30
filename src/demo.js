'use strict';

const { OrderController } = require('./order-controller');
const { VirtualClock } = require('./virtual-clock');
const { formatEvent, formatStatus } = require('./format');

const clock = new VirtualClock();
const controller = new OrderController({ clock, onEvent: event => console.log(formatEvent(event)) });

console.log('[12:00:00] Order controller demo (simulated clock; each cook takes 10 seconds)');
controller.addOrder('Normal'); // #1
controller.addOrder('VIP');    // #2
controller.addOrder('Normal'); // #3
console.log(formatStatus(controller.snapshot(), clock.now()));

controller.addBot();          // VIP #2 first
clock.advance(2_000);
controller.addBot();          // Normal #1
clock.advance(3_000);
controller.addOrder('VIP');   // #4 waits ahead of Normal #3
controller.removeBot();       // cancel #1 and restore its original queue position
console.log(formatStatus(controller.snapshot(), clock.now()));

clock.advance(5_000);         // #2 completes; #4 starts
clock.advance(10_000);        // #4 completes; #1 starts
clock.advance(10_000);        // #1 completes; #3 starts
clock.advance(10_000);        // #3 completes; bot idle
console.log(formatStatus(controller.snapshot(), clock.now()));
