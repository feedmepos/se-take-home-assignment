import { apiService } from "@/services/api";

describe("apiService", () => {
  const mockFetch = jest.fn();
  global.fetch = mockFetch;

  beforeEach(() => {
    mockFetch.mockClear();
  });

  it("createOrder calls fetch with correct params", async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ status: 201, data: { id: 1 } }),
    });

    await apiService.createOrder("John", "normal");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/orders"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ customer_name: "John", order_type: "normal" }),
      })
    );
  });

  it("getSystemStatus calls fetch correctly", async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ status: 200, data: {} }),
    });

    await apiService.getSystemStatus();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/system/status")
    );
  });

  it("scaleBots calls fetch with correct count", async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ status: 200 }),
    });

    await apiService.scaleBots(5);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/bots"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ count: 5 }),
      })
    );
  });

  it("getOrders calls fetch correctly", async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ status: 200, data: [] }),
    });

    await apiService.getOrders();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/orders")
    );
  });

  it("getQueue calls fetch correctly", async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ status: 200, data: [] }),
    });

    await apiService.getQueue();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/orders/queue")
    );
  });
});
