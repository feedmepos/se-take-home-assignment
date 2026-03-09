import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Home from "@/app/page";
import "@testing-library/jest-dom";
import { apiService } from "@/services/api";

// Mock the hook
jest.mock("@/hooks/useRealtimeStatus", () => ({
  useRealtimeStatus: () => ({
    status: {
      active_bots: 2,
      in_process: 1,
      in_queue: 5,
      completed: 10,
      last_actions: ["Action 1", "Action 2"],
    },
    loading: false,
    error: null,
  }),
}));

// Mock the api service
jest.mock("@/services/api", () => ({
  apiService: {
    createOrder: jest.fn(),
    scaleBots: jest.fn(),
    getSystemStatus: jest.fn(),
  },
}));

describe("Home Page", () => {
  it("renders all major sections", () => {
    render(<Home />);
    
    // Header
    expect(screen.getByText("McDonald's Order Controller")).toBeInTheDocument();
    
    // Stats
    expect(screen.getByText("Active Bots")).toBeInTheDocument();
    expect(screen.getByText("Pending Orders")).toBeInTheDocument();
    
    // Forms/Controls
    expect(screen.getByText("Place New Order")).toBeInTheDocument();
    expect(screen.getByText("Workforce Management")).toBeInTheDocument();
    
    // Action Log
    expect(screen.getByText("System Actions")).toBeInTheDocument();
    expect(screen.getByText("Action 1")).toBeInTheDocument();
  });

  it("calls apiService.createOrder when form is submitted", async () => {
    (apiService.createOrder as jest.Mock).mockResolvedValue({ status: 201 });
    render(<Home />);
    
    const input = screen.getByPlaceholderText(/customer name/i);
    fireEvent.change(input, { target: { value: "Bob" } });
    
    const normalButton = screen.getByText(/normal/i);
    fireEvent.click(normalButton);

    await waitFor(() => {
      expect(apiService.createOrder).toHaveBeenCalledWith("Bob", "normal");
    });
  });

  it("calls apiService.scaleBots when scale buttons are clicked", async () => {
    (apiService.scaleBots as jest.Mock).mockResolvedValue({ status: 200 });
    render(<Home />);
    
    const plusButton = screen.getByLabelText(/increase bots/i);
    fireEvent.click(plusButton);

    await waitFor(() => {
      expect(apiService.scaleBots).toHaveBeenCalledWith(3);
    });
  });
});
