function getTimestamp() {
  const now = new Date();
  return now.toISOString().replace("T", " ").substring(0, 19);
}

function format(message) {
  return `[${getTimestamp()}] ${message}`;
}

function printState(queue, workerManager) {
  const workers = workerManager.listWorkers();

  const lines = [];
  lines.push("");
  lines.push(format(`--- SYSTEM STATE ---`));
  lines.push(format(`Queue -> ${queue.getQueueStructure().join(", ")}`));
  workers.forEach((w) => {
    lines.push(
      format(
        `Worker ${w.id} -> ${w.busy ? `BUSY - currently processing order #${w.currentOrderId || "N/A"}` : "IDLE"}`,
      ),
    );
  });
  lines.push(
    format(`Processed Orders -> ${queue.getProcessedOrders().join(", ")}`),
  );

  lines.push(format(`--------------------`));
  lines.push("");
  return lines;
}

module.exports = { format, printState };
