import { createReadStream, statSync, watch, FSWatcher } from "node:fs";

export const tailFile = (filePath: string, onLine: (line: string) => void): (() => void) => {
    let offset = 0;
    let buffer = "";
    let reading = false;

    const readNewData = () => {
        if (reading) return;

        const { size } = statSync(filePath);
        if (size < offset) {
            offset = 0;
        }
        if (size === offset) return;

        const start = offset;
        offset = size;
        reading = true;

        const stream = createReadStream(filePath, { start, end: size - 1 });
        stream.on("data", (chunk) => {
            buffer += chunk.toString();
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            lines.forEach(onLine);
        });
        stream.on("end", () => {
            reading = false;
            readNewData();
        });
    };

    readNewData();
    const watcher: FSWatcher = watch(filePath, readNewData);

    return () => watcher.close();
};
