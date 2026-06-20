jest.mock("@/libs/logger", () => ({
  Logger: jest.fn().mockImplementation(() => ({
    log: jest.fn(),
  })),
}));
