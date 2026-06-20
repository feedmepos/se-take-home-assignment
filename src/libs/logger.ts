import { createWriteStream, WriteStream } from "node:fs";
import { join } from "node:path";

export class Logger {
    private stream: WriteStream

    constructor(filePath: string = join(__dirname, "..", "runtime.log")) {
        this.stream = createWriteStream(filePath, {
            flags: "w",
        });
    }

    private timestamp() {
        return new Date().toTimeString().slice(0, 8);
    }

    log(message: string) {
        const line = `[${this.timestamp()}] ${message}`;

        console.log(line);
        this.stream.write(line + "\n");
    }
}