//Avoid printing to result.txt
jest.mock("./logger", () => ({
  log: jest.fn(),
  writePlain: jest.fn(),
}));

const {
  resetState,
  createVipOrder,
  createNormalOrder,
  addBot,
  removeBot,
  getState,
} = require("./botController");

describe("Bot Controller", () => {

  beforeEach(() => {
    jest.useFakeTimers();
    resetState();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  test("should create VIP order", () => {
    createVipOrder();

    const state = getState();

    expect(state.vipQueue.length).toBe(1);
  });

  test("should create normal order", () => {
    createNormalOrder();

    const state = getState();

    expect(state.normalQueue.length).toBe(1);
  });

  test("should add bot", () => {
    addBot();

    const state = getState();

    expect(state.bots.length).toBe(1);
  });

  test("VIP order should be processed first", () => {
    createNormalOrder();
    createVipOrder();

    addBot();

    const state = getState();

    expect(
      state.processingQueue[0].type
    ).toBe("VIP");
  });

  test("remove bot should return order to queue", () => {
    createVipOrder();

    addBot();

    removeBot();

    const state = getState();

    expect(state.vipQueue.length).toBe(1);
    expect(state.processingQueue.length).toBe(0);
  });

});