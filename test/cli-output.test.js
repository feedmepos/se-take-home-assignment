const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const test = require('node:test');

test('CLI prints timestamped simulation output', () => {
  const output = execFileSync('node', ['dist/cli.js'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });

  assert.match(output, /^Hermes Order Controller - Simulation Results/m);
  assert.match(output, /\[00:00:00\] System initialized with 0 bots/);
  assert.match(output, /\[00:00:03\] Bot #1 picked up VIP Order #1002 - Status: PROCESSING/);
  assert.match(output, /\[00:00:13\] Bot #1 completed VIP Order #1002 - Status: COMPLETE/);
  assert.match(output, /\[00:00:16\] Bot #2 destroyed while processing VIP Order #1004 - order returned to PENDING/);
  assert.match(output, /\[00:00:17\] Bot #3 picked up VIP Order #1004 - Status: PROCESSING/);
  assert.match(output, /- Total Orders Processed: 4 \(2 VIP, 2 Normal\)/);
  assert.match(output, /- Pending Orders: 0/);
  assert.match(output, /Final Status:/);
});

test('CLI output contains only HH:MM:SS timestamps for event lines', () => {
  const output = execFileSync('node', ['dist/cli.js'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  const eventLines = output
    .split('\n')
    .filter((line) => line.startsWith('['));

  assert.ok(eventLines.length > 0);
  for (const line of eventLines) {
    assert.match(line, /^\[[0-9]{2}:[0-9]{2}:[0-9]{2}\] /);
  }
});

test('interactive CLI handles commands from stdin', () => {
  const output = execFileSync('node', ['dist/cli.js', '--interactive'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    input: [
      'normal',
      'vip',
      'bot+',
      'tick 10',
      'status',
      'exit',
      '',
    ].join('\n'),
  });

  assert.match(output, /Hermes Order Controller - Interactive CLI/);
  assert.match(output, /Created Normal Order #1001 - Status: PENDING/);
  assert.match(output, /Created VIP Order #1002 - Status: PENDING/);
  assert.match(output, /Bot #1 picked up VIP Order #1002 - Status: PROCESSING/);
  assert.match(output, /Bot #1 completed VIP Order #1002 - Status: COMPLETE/);
  assert.match(output, /Status/);
  assert.match(output, /Completed: 1/);
  assert.match(output, /Bye\./);
});

test('interactive CLI documents manual tick as a fast-forward command', () => {
  const output = execFileSync('node', ['dist/cli.js', '--interactive'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    input: [
      'help',
      'exit',
      '',
    ].join('\n'),
  });

  assert.match(output, /tick <sec>\s+advance simulated time immediately/);
});
