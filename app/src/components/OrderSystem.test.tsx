import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import OrderSystem from "./OrderSystem";

// Mock timer functions
jest.useFakeTimers();

describe("OrderSystem Component", () => {
  beforeEach(() => {
    // Clear any previous timer mocks
    jest.clearAllTimers();
  });

  test("creates normal orders and displays them in the pending area", () => {
    render(<OrderSystem />);

    // Click the normal order button twice
    fireEvent.click(screen.getByText("New Normal Order"));
    fireEvent.click(screen.getByText("New Normal Order"));

    // Check if orders are created and displayed
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("#2")).toBeInTheDocument();
    expect(screen.getAllByText("NORMAL").length).toBe(2);
    expect(screen.getAllByText("PENDING").length).toBe(2);
  });

  test("creates VIP orders with higher priority than normal orders", () => {
    render(<OrderSystem />);

    // Create a normal order first
    fireEvent.click(screen.getByText("New Normal Order"));

    // Create a VIP order
    fireEvent.click(screen.getByText("New VIP Order"));

    // Create another normal order
    fireEvent.click(screen.getByText("New Normal Order"));

    // Check the order of elements in the DOM
    const orders = screen.getAllByText(/^#\d+$/);
    expect(orders.length).toBe(3);

    // The VIP order (#2) should be first, followed by normal orders (#1, #3)
    expect(orders[0].textContent).toBe("#2"); // VIP order
    expect(orders[1].textContent).toBe("#1"); // First normal order
    expect(orders[2].textContent).toBe("#3"); // Second normal order
  });

  test("VIP orders queue behind existing VIP orders", () => {
    render(<OrderSystem />);

    // Create a normal order
    fireEvent.click(screen.getByText("New Normal Order"));

    // Create first VIP order
    fireEvent.click(screen.getByText("New VIP Order"));

    // Create second VIP order
    fireEvent.click(screen.getByText("New VIP Order"));

    // Create another normal order
    fireEvent.click(screen.getByText("New Normal Order"));

    // Check the order of elements in the DOM
    const orders = screen.getAllByText(/^#\d+$/);
    expect(orders.length).toBe(4);

    // The VIP orders (#2, #3) should be first, followed by normal orders (#1, #4)
    expect(orders[0].textContent).toBe("#2"); // First VIP order
    expect(orders[1].textContent).toBe("#3"); // Second VIP order
    expect(orders[2].textContent).toBe("#1"); // First normal order
    expect(orders[3].textContent).toBe("#4"); // Second normal order
  });

  test("adding a bot processes pending orders", () => {
    render(<OrderSystem />);

    // Create an order
    fireEvent.click(screen.getByText("New Normal Order"));

    // Add a bot
    fireEvent.click(screen.getByText("+ Bot"));

    // Check if the bot is created and processing the order
    expect(screen.getByText("Bot #1")).toBeInTheDocument();
    expect(screen.getByText("PROCESSING")).toBeInTheDocument();

    // Fast-forward time to complete processing
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    // Check if the order is now complete
    expect(screen.getByText("COMPLETE")).toBeInTheDocument();
    expect(screen.getByText("IDLE")).toBeInTheDocument();
  });

  test("removing a bot that is processing returns the order to pending", () => {
    render(<OrderSystem />);

    // Create an order
    fireEvent.click(screen.getByText("New Normal Order"));

    // Add a bot
    fireEvent.click(screen.getByText("+ Bot"));

    // Check if the bot is processing the order
    expect(screen.getByText("PROCESSING")).toBeInTheDocument();

    // Remove the bot
    fireEvent.click(screen.getByText("- Bot"));

    // Check if the order is back to pending
    expect(screen.getByText("PENDING")).toBeInTheDocument();
    expect(screen.queryByText("Bot #1")).not.toBeInTheDocument();
  });

  test("bots process orders in priority order (VIP first)", () => {
    render(<OrderSystem />);

    // Create a normal order
    fireEvent.click(screen.getByText("New Normal Order"));

    // Create a VIP order
    fireEvent.click(screen.getByText("New VIP Order"));

    // Add a bot
    fireEvent.click(screen.getByText("+ Bot"));

    // The bot should process the VIP order first
    expect(screen.getByText("Order #2")).toBeInTheDocument(); // Processing VIP order

    // Fast-forward time to complete processing
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    // Now the bot should process the normal order
    expect(screen.getByText("Order #1")).toBeInTheDocument();
  });

  test("VIP orders preempt processing normal orders", () => {
    render(<OrderSystem />);

    // Create a normal order
    fireEvent.click(screen.getByText("New Normal Order"));

    // Add a bot to process the normal order
    fireEvent.click(screen.getByText("+ Bot"));

    // Verify the bot is processing the normal order
    expect(
      screen.getByText("Order #1", { selector: ".processing-order" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("PROCESSING", { selector: ".bot-status" })
    ).toBeInTheDocument();

    // Create a VIP order
    fireEvent.click(screen.getByText("New VIP Order"));

    // Verify the bot is now processing the VIP order instead
    expect(
      screen.getByText("Order #2", { selector: ".processing-order" })
    ).toBeInTheDocument();

    // Verify the normal order is back to pending
    const orders = screen.getAllByText(/^#\d+$/);
    const normalOrder = orders.find((order) => order.textContent === "#1");
    const normalOrderContainer = screen.getByTestId(
      `order-${normalOrder?.textContent}`
    );
    expect(normalOrderContainer).toHaveTextContent("PENDING");

    // Fast-forward time to complete VIP order processing
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    // Verify the VIP order is complete
    const completeElements = screen.getAllByText("COMPLETE", {
      selector: ".order-status",
    });
    expect(completeElements.length).toBe(1);

    // Verify the bot is now processing the normal order again
    expect(
      screen.getByText("Order #1", { selector: ".processing-order" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("PROCESSING", { selector: ".bot-status" })
    ).toBeInTheDocument();
  });
});
