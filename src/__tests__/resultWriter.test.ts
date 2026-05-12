import * as fs from "fs";
import * as path from "path";

// Use real module but mock fs to avoid hitting the filesystem
jest.mock("fs");

const mockedFs = fs as jest.Mocked<typeof fs>;

// Re-import after mocking
import { write, clearResult } from "../orderController/resultWriter";

const RESULT_PATH = path.resolve(__dirname, "../../scripts/result.txt");

describe("resultWriter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("clearResult writes empty string to result.txt", () => {
    clearResult();
    expect(mockedFs.writeFileSync).toHaveBeenCalledWith(RESULT_PATH, "", "utf8");
  });

  test("write appends a line with HH:MM:SS timestamp format", () => {
    write("Test message");
    expect(mockedFs.appendFileSync).toHaveBeenCalledTimes(1);
    const callArg = (mockedFs.appendFileSync as jest.Mock).mock.calls[0][1] as string;
    expect(callArg).toMatch(/^\[\d{2}:\d{2}:\d{2}\] Test message\n$/);
  });

  test("write appends multiple lines independently", () => {
    write("Line 1");
    write("Line 2");
    expect(mockedFs.appendFileSync).toHaveBeenCalledTimes(2);
  });
});
