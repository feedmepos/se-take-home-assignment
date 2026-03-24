const fs = require('fs');
const path = require('path');
const { UTC_OFFSET_MS } = require('./constants');

const RESULT_FILE = path.join(__dirname, '..', 'scripts', 'result.txt');

let emitFn = null; // set by server to broadcast state updates

function setEmit(fn) {
  emitFn = fn;
}

function log(message) {
  const now = new Date();
  const t = new Date(now.getTime() + UTC_OFFSET_MS);
  const ts = `${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')}:${String(t.getUTCSeconds()).padStart(2, '0')}`;
  const line = `${ts} - ${message}`;
  console.log(line);
  fs.appendFileSync(RESULT_FILE, line + '\n');
}

function broadcastState(state) {
  if (emitFn) emitFn(state);
}

module.exports = { log, broadcastState, setEmit };
