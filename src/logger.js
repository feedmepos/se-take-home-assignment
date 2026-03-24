const fs = require('fs');
const path = require('path');

const RESULT_FILE = path.join(__dirname, '..', 'scripts', 'result.txt');

let emitFn = null; // set by server to broadcast state updates

function setEmit(fn) {
  emitFn = fn;
}

function log(message) {
  const line = `${new Date().toTimeString().slice(0, 8)} - ${message}`; // "HH:MM:SS"
  console.log(line);
  fs.appendFileSync(RESULT_FILE, line + '\n');
}

function broadcastState(state) {
  if (emitFn) emitFn(state);
}

module.exports = { log, broadcastState, setEmit };
