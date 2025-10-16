import * as fs from "fs";
import { formatTime } from "../utils/time";

export interface Logger {
  info: (message: string) => void;
}

export function createLogger(outputPath: string): Logger {
  function write(line: string): void {
    const ts = formatTime(new Date());
    const formatted = `[${ts}] ${line}`;
    fs.appendFileSync(outputPath, `${formatted}\n`);
    // eslint-disable-next-line no-console
    console.log(formatted);
  }
  return { info: write };
}
