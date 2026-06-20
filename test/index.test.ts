import { runDemo } from "@/run-demo";
import { PROCESS_DURATION_MS } from "@/constants";

describe("Main App", () => {
  beforeEach(() => {
    jest.useRealTimers();
  })

  describe("Run Demo", () => {
    it("should closely follow the pattern from requirement result.txt", () => {
      jest.useFakeTimers();
      const logSpy = jest.spyOn(console, "log").mockImplementation(() => { });

      runDemo();
      jest.advanceTimersByTime(2 * PROCESS_DURATION_MS + 3_000);

      const logs = logSpy.mock.calls.map((args) => args.join(" "));

      expect(logs).toEqual(expect.arrayContaining([
        expect.stringContaining("Total Orders Processed: 4 (2 VIP, 2 Normal)"),
        expect.stringContaining("Orders Completed: 4"),
        expect.stringContaining("Active Bots: 1"),
        expect.stringContaining("Pending Orders: 0"),
      ]));

      logSpy.mockRestore();
    })
  })
})
