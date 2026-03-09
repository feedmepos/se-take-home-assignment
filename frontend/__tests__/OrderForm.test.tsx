import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { OrderForm } from "@/components/OrderForm";
import "@testing-library/jest-dom";

describe("OrderForm Component", () => {
  const mockOnCreateOrder = jest.fn();

  beforeEach(() => {
    mockOnCreateOrder.mockClear();
  });

  it("submits the form with provided customer name", async () => {
    render(<OrderForm onCreateOrder={mockOnCreateOrder} isSubmitting={false} />);
    
    const input = screen.getByPlaceholderText(/customer name/i);
    fireEvent.change(input, { target: { value: "John Doe" } });
    
    const normalButton = screen.getByText(/normal/i);
    fireEvent.click(normalButton);

    await waitFor(() => {
      expect(mockOnCreateOrder).toHaveBeenCalledWith("John Doe", "normal");
    });
    expect(input).toHaveValue("");
  });

  it("submits the form with default name when input is empty", async () => {
    render(<OrderForm onCreateOrder={mockOnCreateOrder} isSubmitting={false} />);
    
    const vipButton = screen.getByText(/vip/i);
    fireEvent.click(vipButton);

    await waitFor(() => {
      expect(mockOnCreateOrder).toHaveBeenCalledWith("VIP Guest", "vip");
    });
  });

  it("disables inputs and buttons when isSubmitting is true", () => {
    render(<OrderForm onCreateOrder={mockOnCreateOrder} isSubmitting={true} />);
    
    expect(screen.getByPlaceholderText(/customer name/i)).toBeDisabled();
    expect(screen.getByText(/normal/i).closest('button')).toBeDisabled();
    expect(screen.getByText(/vip/i).closest('button')).toBeDisabled();
  });
});
