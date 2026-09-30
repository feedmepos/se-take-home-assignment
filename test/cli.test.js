'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const cli = path.join(__dirname, '..', 'src', 'cli.js');

test('demo prints timestamped completion, cancellation, and final status', () => {
  const result = spawnSync(process.execPath, [cli, '--demo'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const lines = result.stdout.trim().split('\n');
  assert.ok(lines.every((line) => /^\[\d{2}:\d{2}:\d{2}\] /.test(line)));
  assert.match(result.stdout, /\[12:00:10\] Bot #1 completed VIP Order #2/);
  assert.match(result.stdout, /Removed Bot #2; VIP Order #4 returned to PENDING/);
  assert.match(result.stdout, /\[12:00:50\] Bot #1 completed Normal Order #5/);
  assert.match(result.stdout, /COMPLETE: VIP #2, VIP #4, Normal #1, Normal #3, Normal #5/);
});

test('interactive CLI accepts commands and reports state', () => {
  const result = spawnSync(process.execPath, [cli], {
    input: 'normal\nvip\nstatus\n+ bot\nstatus\n- bot\nstatus\nexit\n',
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /PENDING: VIP #2, Normal #1/);
  assert.match(result.stdout, /PROCESSING: Bot #1: VIP #2/);
  assert.match(result.stdout, /Removed Bot #1; VIP Order #2 returned to PENDING/);
  assert.match(result.stdout, /Goodbye/);
});
