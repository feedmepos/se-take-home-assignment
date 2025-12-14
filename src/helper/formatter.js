export function formatBotId(id) {
  return String(id);
}

export function formatOrderId(id) {
  return String(id).padStart(4, "0");
}

export function logger(message = ``) {
  console.log(`[${_formatHHMMSS()}] ${message}`);
}

function _formatHHMMSS() {
  let currentDate = new Date();
  return (
    ("0" + currentDate.getHours()).slice(-2) +
    ":" +
    ("0" + currentDate.getMinutes()).slice(-2) +
    ":" +
    ("0" + currentDate.getSeconds()).slice(-2)
  );
}
