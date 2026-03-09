import { renderHook, waitFor, act } from "@testing-library/react";
import { useRealtimeStatus } from "@/hooks/useRealtimeStatus";
import { apiService } from "@/services/api";

jest.mock("@/services/api");

describe("useRealtimeStatus Hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("fetches status on mount", async () => {
    const mockStatus = { active_bots: 2, last_actions: [] };
    (apiService.getSystemStatus as jest.Mock).mockResolvedValue({
      status: 200,
      data: mockStatus,
    });

    const { result } = renderHook(() => useRealtimeStatus());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.status).toEqual(mockStatus);
    });
    expect(result.current.loading).toBe(false);
  });

  it("polls for status at intervals", async () => {
    (apiService.getSystemStatus as jest.Mock).mockResolvedValue({
      status: 200,
      data: { active_bots: 1, last_actions: [] },
    });

    renderHook(() => useRealtimeStatus(1000));

    expect(apiService.getSystemStatus).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(apiService.getSystemStatus).toHaveBeenCalledTimes(2);

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(apiService.getSystemStatus).toHaveBeenCalledTimes(3);
  });

  it("sets error when fetch fails", async () => {
    (apiService.getSystemStatus as jest.Mock).mockRejectedValue(new Error("Network Error"));

    const { result } = renderHook(() => useRealtimeStatus());

    await waitFor(() => {
      expect(result.current.error).toBe("Failed to fetch system status");
    });
    expect(result.current.loading).toBe(false);
  });
});
