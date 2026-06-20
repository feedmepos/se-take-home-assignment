import { createWriteStream, WriteStream } from "node:fs";
import { join } from "node:path";

export class Logger {
    private stream: WriteStream
    private silent: boolean
    public filePath: string

    constructor(silent = false) {
        this.filePath = join(__dirname, "..", "runtime.log")
        this.stream = createWriteStream(this.filePath, {
            flags: "w",
        });
        this.silent = silent;
    }

    private timestamp() {
        return new Date().toTimeString().slice(0, 8);
    }

    log(message: string) {
        const line = `[${this.timestamp()}] ${message}`;

        if (!this.silent) {
            console.log(line);
        }
        this.stream.write(line + "\n");
    }
}