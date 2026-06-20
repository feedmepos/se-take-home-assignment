import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { describe, it } from "node:test";

describe("CLI result output", () => {
  it("prefixes every non-empty result line with an HH:MM:SS timestamp", () => {
    const output = execFileSync(process.execPath, ["dist/src/cli.js"], {
      cwd: process.cwd(),
      encoding: "utf8",
    });

    const lines = output.split(/\r?\n/).filter((line) => line.trim().length > 0);

    assert.ok(lines.length > 0, "Expected CLI output to contain lines");
    assert.ok(
      lines.every((line) => /^\[\d{2}:\d{2}:\d{2}\]/.test(line)),
      `Expected every line to start with a timestamp:\n${output}`
    );
  });
});
