import { formatTime, nowTime } from "./time";

describe("time utils", () => {
  test("formatTime returns HH:mm:ss", () => {
    const d = new Date(2020, 0, 1, 9, 5, 7); // Jan 1 2020 09:05:07
    const s = formatTime(d);
    expect(s).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    expect(s.endsWith(":07")).toBe(true);
  });

  test("nowTime returns current HH:mm:ss string", () => {
    const s = nowTime();
    expect(s).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });
});
