import * as fs from "fs";
import { LogParams, LogType, OutputType } from "../types";

const LOG_FILE = "output.log";
const { FILE, CONSOLE, BOTH } = OutputType;
const {
  SYSTEM_INIT,
  BOT_CREATE,
  BOT_IDLE,
  BOT_DESTROY,
  BOT_PROCESS,
  BOT_COMPLETE,
  BOT_STOP,
  ORDER_CREATE,
} = LogType;

export class Logger {
  // 定义初始 log type
  private type: OutputType = CONSOLE;

  constructor() {
    // 清空 log file 内容
    fs.writeFileSync(LOG_FILE, "");
  }

  // 定义一个改变 log type 的 method
  setLogOutput(type: OutputType): void {
    this.type = type;
  }

  // 定义一个根据 type 决定要 console 还是 writeFile 的 method
  log(msg: string): void {
    // toTimeString() -> 11:00:01 GMT+0800 (Malaysia Time)
    // toTimeString().slice(0, 8) -> 11:00:01
    const timestamp = new Date().toTimeString().slice(0, 8);
    const output = `[${timestamp}] ${msg}`;

    if (this.type === CONSOLE || this.type === BOTH) {
      console.log(output);
    }

    if (this.type === FILE || this.type === BOTH) {
      fs.appendFileSync(LOG_FILE, output + "\n");
    }
  }
}

// 创建唯一实例
export const logger = new Logger();

// 重新封装 logger.log(msg) 成 log(msg)，方便使用
export const log = (type: LogType, params: Partial<LogParams> = {}) => {
  let logMsg = "";
  const { bot_id, order_id, order_type, order_status } = params;

  switch (type) {
    case SYSTEM_INIT:
      logMsg = "System initialized";
      break;
    case BOT_CREATE:
      logMsg = `Bot #${bot_id} created - Status: ACTIVE`;
      break;
    case BOT_IDLE:
      logMsg = `Bot #${bot_id} is now IDLE - No pending orders`;
      break;
    case BOT_DESTROY:
      logMsg = `Bot #${bot_id} destroyed`;
      break;
    case BOT_PROCESS:
      logMsg = `Bot #${bot_id} started processing Order(${order_type?.toUpperCase()}) #${order_id} - Status: ${order_status?.toUpperCase()}`;
      break;
    case BOT_COMPLETE:
      logMsg = `Bot #${bot_id} completed Order(${order_type?.toUpperCase()}) #${order_id} - Status: ${order_status?.toUpperCase()}`;
      break;
    case BOT_STOP:
      logMsg = `Bot #${bot_id} stopped processing Order(${order_type?.toUpperCase()}) #${order_id} - Status: ${order_status?.toUpperCase()}`;
      break;
    case ORDER_CREATE:
      logMsg = `Created Order(${order_type?.toUpperCase()}) #${order_id} - Status: ${order_status?.toUpperCase()}`;
      break;
  }

  return logger.log(logMsg);
};
