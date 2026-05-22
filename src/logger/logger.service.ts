import { Injectable } from '@nestjs/common';

@Injectable()
export class LoggerService {
  // private logFilePath: string = path.join(
  //   process.cwd(),
  //   'scripts',
  //   'result.txt',
  // );
  // private writeStream: fs.WriteStream;

  // onModuleInit() {
  //   if (fs.existsSync(this.logFilePath)) {
  //     fs.writeFileSync(this.logFilePath, '');
  //   }

  //   this.writeStream = fs.createWriteStream(this.logFilePath, { flags: 'a' });
  // }

  // onModuleDestroy() {
  //   if (this.writeStream) {
  //     this.writeStream.end();
  //   }
  // }

  private formatTime(): string {
    const now = new Date();
    const hours = String(now.getUTCHours()).padStart(2, '0');
    const minutes = String(now.getUTCMinutes()).padStart(2, '0');
    const seconds = String(now.getUTCSeconds()).padStart(2, '0');
    return `[${hours}:${minutes}:${seconds}]`;
  }

  log(message: string): void {
    // const logMessage = `${message}\n`;

    console.log(message);

    // if (this.writeStream) {
    //   this.writeStream.write(logMessage);
    // }
  }

  logWithTimestamp(message: string): void {
    this.log(`${this.formatTime()} ${message}`);
  }

  logNewLine(): void {
    this.log('');
  }
}
