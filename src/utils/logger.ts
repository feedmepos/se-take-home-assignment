import { format } from 'date-fns'
import { createWriteStream, existsSync, rmSync } from 'fs'

const RESULT_FILE = './scripts/result.txt'

// Clean old result on each run to keep CI deterministic
if (existsSync(RESULT_FILE)) {
  rmSync(RESULT_FILE)
}

const stream = createWriteStream(RESULT_FILE, { flags: 'a' })

export function logLine(message: string) {
  const now = new Date()
  const time = format(now, 'HH:mm:ss')

  const text = `[${time}] ${message}`
  stream.write(`${text}\n`)
}

export function closeLogger() {
  stream.end()
}

export { RESULT_FILE }
