import MockFileLogger from "../MockFileLogger";
import Storage from "../Storage";
import AddBot from "./AddBot";

let storage;
let fileLogger;

beforeEach(() => {
  storage = new Storage();
  fileLogger = new MockFileLogger();
});

describe("AddBot", () => {
  describe("execute", () => {
    it("should add a bot", () => {
      const ab = new AddBot(storage, fileLogger);

      ab.execute();

      const botArray = storage.getBotArray();
      expect(botArray).toHaveLength(1);
    });
  });
});
