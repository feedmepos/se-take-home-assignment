interface LoggerOptions {
  baseTimeSeconds?: number;
}

export class Logger {
  private readonly entries: string[] = [];
  private readonly baseTimeSeconds: number;

  constructor(options: LoggerOptions = {}) {
    this.baseTimeSeconds = options.baseTimeSeconds ?? 0;
  }

  log(timeSeconds: number, message: string): void {
    const timestamp = this.formatTime(this.baseTimeSeconds + timeSeconds);
    this.entries.push(`[${timestamp}] ${message}`);
  }

  pushRaw(message = ""): void {
    this.entries.push(message);
  }

  toString(): string {
    return this.entries.join("\n");
  }

  private formatTime(totalSeconds: number): string {
    const seconds = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(seconds / 3600) % 24;
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return [hours, minutes, secs]
      .map((value) => value.toString().padStart(2, "0"))
      .join(":");
  }
}
