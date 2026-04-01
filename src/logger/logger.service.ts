export class LoggerService {
  log(message: string, withTimestamp = true): void {
    if (withTimestamp) {
      console.log(`[${this.timestamp()}] ${message}`);
    } else {
      console.log(message);
    }
  }

  private timestamp(): string {
    return new Date().toTimeString().slice(0, 8);
  }
}
