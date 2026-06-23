const assert = require('node:assert/strict');
const test = require('node:test');

const { createInteractiveSession } = require('../dist/interactive-cli');

test('interactive session auto-advances with real elapsed time', () => {
  let now = 0;
  const output = [];
  const session = createInteractiveSession(
    (line) => output.push(line),
    {
      autoAdvance: true,
      intervalMs: 60_000,
      nowMs: () => now,
    },
  );

  session.handleCommand('vip');
  session.handleCommand('bot+');
  now = 11_000;
  session.syncWithRealTime();
  session.printStatus();
  session.stop();

  const text = output.join('\n');
  assert.match(text, /Bot #1 picked up VIP Order #1001 - Status: PROCESSING/);
  assert.match(text, /Bot #1 completed VIP Order #1001 - Status: COMPLETE/);
  assert.match(text, /Completed: 1/);
});
