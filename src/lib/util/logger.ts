import winston from "winston";
import path from "path";
import fs from "fs";

// Ensure log directory exists
const logDir = path.join("scripts");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "HH:mm:ss" }),
    winston.format.printf(
      (info) => `[${info.timestamp}]: ${info.level}: ${info.message}`
    )
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, "result.txt"),
      level: "info",
    }),
  ],
});

// Also log to console (optional)
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: "HH:mm:ss" }),
        winston.format.printf(
          (info) => `[${info.timestamp}]: ${info.level}: ${info.message}`
        )
      ),
    })
  );
}

export default logger;
