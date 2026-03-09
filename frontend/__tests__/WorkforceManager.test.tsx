import { render, screen, fireEvent } from "@testing-library/react";
import { WorkforceManager } from "@/components/WorkforceManager";
import "@testing-library/jest-dom";

describe("WorkforceManager Component", () => {
  const mockOnScale = jest.fn();

  it("renders active bot count", () => {
    render(<WorkforceManager activeBots={5} onScale={mockOnScale} />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("calls onScale with +1 when plus button clicked", () => {
    render(<WorkforceManager activeBots={5} onScale={mockOnScale} />);
    const plusButton = screen.getByLabelText(/increase bots/i);
    fireEvent.click(plusButton);
    expect(mockOnScale).toHaveBeenCalledWith(1);
  });

  it("calls onScale with -1 when minus button clicked", () => {
    render(<WorkforceManager activeBots={5} onScale={mockOnScale} />);
    const minusButton = screen.getByLabelText(/decrease bots/i);
    fireEvent.click(minusButton);
    expect(mockOnScale).toHaveBeenCalledWith(-1);
  });
});
