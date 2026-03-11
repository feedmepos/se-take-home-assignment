"use strict";

const { createWriteStream } = require("fs");
const { resolve } = require("path");

class Logger {
  constructor(outputPath) {
    this._lines = [];
    this._stream = outputPath
      ? createWriteStream(resolve(outputPath), { flags: "w" })
      : null;
  }

  timestamp() {
    return new Date().toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  _write(level, msg) {
    const line = `[${this.timestamp()}] [${level}] ${msg}`;
    console.log(line);
    if (this._stream) this._stream.write(line + "\n");
    this._lines.push(line);
  }

  info(msg)  { this._write("INFO ", msg); }
  warn(msg)  { this._write("WARN ", msg); }
  error(msg) { this._write("ERROR", msg); }

  section(title) {
    const bar = "─".repeat(50);
    const line = `\n${bar}\n  ${title}\n${bar}`;
    console.log(line);
    if (this._stream) this._stream.write(line + "\n");
  }

  close() {
    return new Promise(resolve => {
      if (this._stream) this._stream.end(resolve);
      else resolve();
    });
  }
}

module.exports = Logger;
