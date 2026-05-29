import fs from 'fs';
import path from 'path';
import { formatTimestamp } from '../controller/Order.js';

const resultPath = path.join(process.cwd(), 'scripts', 'result.txt');

// 清空文件
fs.writeFileSync(resultPath, '', 'utf8');

export function log(message: string): void {
  const timestamp = formatTimestamp(new Date());
  const line = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(resultPath, line, 'utf8');
  console.log(line.trim());
}

export function writeText(text: string): void {
  fs.appendFileSync(resultPath, text + '\n', 'utf8');
  console.log(text);
}
