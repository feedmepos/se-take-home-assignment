const { randomUUID } = require('crypto');

function generateSystemId() {
  return randomUUID();
}

function generateDisplayId(prefix = '') {
  const now = new Date();
  const time = now.toTimeString().slice(0, 8).replace(/:/g, ''); // "143022"
  const rand = Array.from({ length: 3 }, () =>
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]
  ).join('');
  const id = time + rand; // e.g. "143022XKP"
  return prefix ? `${prefix}-${id}` : id;
}

module.exports = { generateSystemId, generateDisplayId };
