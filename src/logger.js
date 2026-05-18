const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../scripts/result.txt");

// Clear file on startup
fs.writeFileSync(filePath, "");

function getTime() {
    return new Date().toTimeString().split(" ")[0]; // HH:MM:SS
}

function log(message) {
    const line = `[${getTime()}] ${message}\n`;
    fs.appendFileSync(filePath, line);

    console.log(line.trim());
}

function writePlain(message) {
  fs.appendFileSync(filePath, message + "\n");

  console.log(message);
}

module.exports = {
  log,
  writePlain
};
