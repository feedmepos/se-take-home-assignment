'use strict'

const fs = require('fs')

function timestamp() {
  return new Date().toTimeString().slice(0, 8) // HH:MM:SS
}

class Logger {
  constructor(outputPath = null) {
    this.outputPath = outputPath
    if (outputPath) fs.writeFileSync(outputPath, '', 'utf8') // truncate on start
  }

  log(msg) {
    const line = `[${timestamp()}] ${msg}`
    console.log(line)
    if (this.outputPath) {
      fs.appendFileSync(this.outputPath, line + '\n', 'utf8')
    }
    return line
  }

  separator(title = '') {
    const bar = '─'.repeat(50)
    const line = title ? `[${timestamp()}] ── ${title} ${'─'.repeat(Math.max(0, 46 - title.length))}` : `[${timestamp()}] ${bar}`
    console.log(line)
    if (this.outputPath) fs.appendFileSync(this.outputPath, line + '\n', 'utf8')
  }
}

module.exports = Logger
