const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createQueue } = require('../src/queue');

test('normal order goes to end', () => {
  const q = createQueue();
  q.enqueue({ id: 1, type: 'NORMAL' });
  q.enqueue({ id: 2, type: 'NORMAL' });
  assert.deepEqual(q.list().map((o) => o.id), [1, 2]);
});

test('VIP order goes before all normals', () => {
  const q = createQueue();
  q.enqueue({ id: 1, type: 'NORMAL' });
  q.enqueue({ id: 2, type: 'VIP' });
  assert.deepEqual(q.list().map((o) => o.id), [2, 1]);
});

test('VIP order goes after existing VIPs', () => {
  const q = createQueue();
  q.enqueue({ id: 1, type: 'VIP' });
  q.enqueue({ id: 2, type: 'NORMAL' });
  q.enqueue({ id: 3, type: 'VIP' });
  assert.deepEqual(q.list().map((o) => o.id), [1, 3, 2]);
});

test('dequeue removes from front', () => {
  const q = createQueue();
  q.enqueue({ id: 1, type: 'VIP' });
  q.enqueue({ id: 2, type: 'NORMAL' });
  assert.equal(q.dequeue().id, 1);
  assert.equal(q.size, 1);
});

test('returnToQueue maintains VIP priority', () => {
  const q = createQueue();
  q.enqueue({ id: 1, type: 'VIP' });
  q.enqueue({ id: 2, type: 'NORMAL' });
  q.returnToQueue({ id: 3, type: 'NORMAL' });
  assert.deepEqual(q.list().map((o) => o.id), [1, 2, 3]);
});

test('returnToQueue VIP goes before normals', () => {
  const q = createQueue();
  q.enqueue({ id: 1, type: 'NORMAL' });
  q.returnToQueue({ id: 2, type: 'VIP' });
  assert.deepEqual(q.list().map((o) => o.id), [2, 1]);
});

test('dequeue on empty queue returns undefined', () => {
  const q = createQueue();
  assert.equal(q.dequeue(), undefined);
});

test('returnToQueue restores interrupted NORMAL before later same-priority orders', () => {
  const q = createQueue();
  q.enqueue({ id: 1, type: 'NORMAL' });
  q.enqueue({ id: 2, type: 'NORMAL' });
  const interrupted = q.dequeue(); // picks up id:1
  q.enqueue({ id: 3, type: 'NORMAL' }); // arrives while id:1 is processing
  q.returnToQueue(interrupted); // id:1 should go before id:2 and id:3
  assert.deepEqual(q.list().map((o) => o.id), [1, 2, 3]);
});

test('returnToQueue restores interrupted VIP before later same-priority orders', () => {
  const q = createQueue();
  q.enqueue({ id: 1, type: 'VIP' });
  q.enqueue({ id: 2, type: 'VIP' });
  const interrupted = q.dequeue(); // picks up id:1
  q.enqueue({ id: 3, type: 'VIP' }); // arrives while id:1 is processing
  q.returnToQueue(interrupted); // id:1 should go before id:2 and id:3
  assert.deepEqual(q.list().map((o) => o.id), [1, 2, 3]);
});
