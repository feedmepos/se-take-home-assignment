import pino from "pino";

class FileLogger {
  #filePath = "scripts/result.txt";
  #logger;

  constructor() {
    const transport = pino.transport({
      targets: [
        {
          level: "info",
          options: {
            append: false,
            colorize: false,
            destination: this.#filePath,
            ignore: "hostname,level,pid",
            translateTime: "SYS:HH:MM:ss",
          },
          target: "pino-pretty",
        },
      ],
    });
    this.#logger = pino(transport);
  }

  log(message) {
    this.#logger.info(message);
  }
}

export default FileLogger;
