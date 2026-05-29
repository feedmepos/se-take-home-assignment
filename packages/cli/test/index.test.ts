import { describe, expect, it } from "vitest";

import { runDemo } from "../src/index.js";

describe("CLI demo", () => {
  it("renders a timestamped scripted scenario with completion and requeue events", () => {
    const output = runDemo();

    expect(output).toContain("McDonald's Order Management System - Simulation Results");
    expect(output).toMatch(/\[\d{2}:\d{2}:\d{2}\]/);
    expect(output).toContain("returned to pending");
    expect(output).toContain("completed VIP Order");
    expect(output).toContain("Final Status:");
    expect(output).toContain("Processing: none");
    expect(output).toContain("complete=4");
  });
});
