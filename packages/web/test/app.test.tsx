import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { App } from "../src/App";

const snapshot = {
  serverTime: Date.UTC(2026, 0, 1, 14, 32, 0),
  processDurationMs: 10_000,
  pendingOrders: [],
  processingOrders: [],
  completedOrders: [],
  bots: [],
  metrics: {
    pendingCount: 0,
    processingCount: 0,
    completedCount: 0,
    activeBotCount: 0,
    idleBotCount: 0,
    vipPendingCount: 0,
    normalPendingCount: 0,
    vipCompletedCount: 0,
    normalCompletedCount: 0,
    totalOrdersCreated: 0,
    averageProcessingTimeSeconds: 0,
    botUtilizationRate: 0,
    ordersCompletedPerMinute: 0,
  },
};

type MockEventSourceInstance = {
  closed: boolean;
  emit: (type: string, data: unknown) => void;
  triggerError: () => void;
};

function getMockEventSource() {
  return (globalThis as typeof globalThis & {
    __mockEventSource: { instances: MockEventSourceInstance[] };
  }).__mockEventSource;
}

describe("App", () => {
  it("renders customer and manager actions after loading state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ snapshot }),
      }),
    );

    render(<App />);

    expect(
      await screen.findByRole("button", { name: "New Normal Order" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Bot" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Timeline/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pending" })).toBeInTheDocument();
    expect(screen.getByLabelText("Pending count")).toHaveTextContent("0");
    expect(screen.getByLabelText("Pending detail")).toHaveTextContent(
      "VIP 0 / Normal 0",
    );
  });

  it("reacts to live SSE updates", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ snapshot }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ snapshot }),
      });

    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    await screen.findByRole("button", { name: /Timeline/ });

    const MockEventSource = getMockEventSource();

    await act(async () => {
      MockEventSource.instances.at(-1)?.emit("order.created", {
        id: 1,
        type: "order.created",
        timestamp: Date.UTC(2026, 0, 1, 14, 32, 1),
        message: "VIP Order #1001 created",
        snapshot: {
          ...snapshot,
          pendingOrders: [
            {
              id: 1001,
              priority: "vip",
              status: "pending",
              createdAt: Date.UTC(2026, 0, 1, 14, 32, 1),
            },
          ],
          metrics: {
            ...snapshot.metrics,
            pendingCount: 1,
            vipPendingCount: 1,
            totalOrdersCreated: 1,
          },
        },
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Order #1001")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Timeline/ }));

    expect(
      screen.getByRole("dialog", { name: "Event Timeline" }),
    ).toBeInTheDocument();
    expect(screen.getByText("VIP Order #1001 created")).toBeInTheDocument();
  });

  it("deduplicates repeated SSE events in the timeline", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ snapshot }),
      }),
    );

    render(<App />);
    await screen.findByRole("button", { name: /Timeline/ });

    const MockEventSource = getMockEventSource();

    const repeatedEvent = {
      id: 10,
      type: "bot.added",
      timestamp: Date.UTC(2026, 0, 1, 14, 32, 10),
      message: "Bot #1 created",
      snapshot,
    };

    await act(async () => {
      MockEventSource.instances.at(-1)?.emit("bot.added", repeatedEvent);
      MockEventSource.instances.at(-1)?.emit("bot.added", repeatedEvent);
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Timeline/ }));

    await waitFor(() => {
      expect(screen.getAllByText("Bot #1 created")).toHaveLength(1);
    });

    await user.click(screen.getByRole("button", { name: "Close timeline dialog" }));

    expect(screen.queryByRole("dialog", { name: "Event Timeline" })).not.toBeInTheDocument();
  });

  it("shows processing progress for assigned orders", async () => {
    const processingStartedAt = Date.UTC(2026, 0, 1, 14, 32, 0);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          snapshot: {
            ...snapshot,
            serverTime: processingStartedAt + 5_000,
            processingOrders: [
              {
                id: 1001,
                priority: "normal",
                status: "processing",
                createdAt: processingStartedAt,
                processingStartedAt,
                assignedBotId: 1,
              },
            ],
            metrics: {
              ...snapshot.metrics,
              processingCount: 1,
            },
          },
        }),
      }),
    );

    render(<App />);

    expect(
      await screen.findByRole("progressbar", {
        name: "Order #1001 processing progress",
      }),
    ).toHaveAttribute("aria-valuenow", "50");
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("opens selected items in a detail dialog", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          snapshot: {
            ...snapshot,
            bots: [
              {
                id: 1,
                status: "idle",
                createdAt: snapshot.serverTime,
                lastUpdatedAt: snapshot.serverTime,
                completedOrders: 2,
              },
            ],
          },
        }),
      }),
    );

    render(<App />);

    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /Bot #1/i }));

    expect(
      screen.getByRole("dialog", { name: "Bot #1" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close detail dialog" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows dismissible errors when the API fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("API is offline")),
    );

    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "API is offline",
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Dismiss error" }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("retries after the initial state load fails", async () => {
    vi.useFakeTimers();

    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("API is offline"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ snapshot }),
      });

    vi.stubGlobal("fetch", fetchMock);

    try {
      render(<App />);

      await act(async () => {
        await Promise.resolve();
      });

      expect(screen.getByRole("alert")).toHaveTextContent("API is offline");

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1500);
      });

      expect(
        screen.getByRole("button", { name: "New Normal Order" }),
      ).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not create an event stream after unmounting during initial load", async () => {
    let resolveFetch: (value: { ok: true; json: () => Promise<{ snapshot: typeof snapshot }> }) => void;
    const fetchPromise = new Promise<{
      ok: true;
      json: () => Promise<{ snapshot: typeof snapshot }>;
    }>((resolve) => {
      resolveFetch = resolve;
    });

    vi.stubGlobal("fetch", vi.fn().mockReturnValue(fetchPromise));

    const { unmount } = render(<App />);
    unmount();

    await act(async () => {
      resolveFetch({
        ok: true,
        json: async () => ({ snapshot }),
      });
      await fetchPromise;
    });

    expect(getMockEventSource().instances).toHaveLength(0);
  });

  it("ignores the SSE connection handshake in the timeline", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ snapshot }),
      }),
    );

    render(<App />);
    await screen.findByRole("button", { name: /Timeline/ });

    await act(async () => {
      getMockEventSource().instances.at(-1)?.emit("bot.idle", {
        id: 0,
        type: "bot.idle",
        timestamp: Date.UTC(2026, 0, 1, 14, 32, 0),
        message: "Event stream connected",
        snapshot,
      });
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Timeline/ }));

    expect(screen.getByText("No live events yet.")).toBeInTheDocument();
    expect(screen.queryByText("Event stream connected")).not.toBeInTheDocument();
  });

  it("submits customer actions through the API", async () => {
    const nextSnapshot = {
      ...snapshot,
      pendingOrders: [
        {
          id: 1001,
          priority: "vip",
          status: "pending",
          createdAt: Date.UTC(2026, 0, 1, 14, 33, 0),
        },
      ],
      metrics: {
        ...snapshot.metrics,
        pendingCount: 1,
        vipPendingCount: 1,
        totalOrdersCreated: 1,
      },
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ snapshot }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ snapshot: nextSnapshot }),
      });

    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    await screen.findByRole("button", { name: "New VIP Order" });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "New VIP Order" }));

    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://localhost:3001/orders",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(await screen.findByText("Order #1001")).toBeInTheDocument();
  });
});
