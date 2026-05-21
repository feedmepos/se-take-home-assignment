const fs = require("fs")
const path = require("path")

class Logger {

  constructor() {
    this.file = path.join(__dirname, "../scripts/result.txt")

    fs.writeFileSync(
      this.file,
      "McDonald's Order Management System - Simulation Results\n\n"
    )
  }

  time() {
    return new Date().toTimeString().split(" ")[0]
  }

  log(message) {
    const line = `[${this.time()}] ${message}\n`
    fs.appendFileSync(this.file, line)
  }

}

module.exports = Logger