import * as fs from "fs";
import * as path from "path";

const RESULT_PATH = path.resolve(__dirname, "../../scripts/result.txt");

function timestamp(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export function clearResult(): void {
  fs.writeFileSync(RESULT_PATH, "", "utf8");
}

export function write(line: string): void {
  fs.appendFileSync(RESULT_PATH, `[${timestamp()}] ${line}\n`, "utf8");
}
