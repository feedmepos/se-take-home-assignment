import { render, screen } from "@testing-library/react";
import { ActionLog } from "@/components/ActionLog";
import "@testing-library/jest-dom";

describe("ActionLog Component", () => {
  it("renders a list of actions", () => {
    const actions = ["Action A", "Action B"];
    render(<ActionLog actions={actions} />);
    
    expect(screen.getByText("Action A")).toBeInTheDocument();
    expect(screen.getByText("Action B")).toBeInTheDocument();
  });

  it("shows waiting message when empty", () => {
    render(<ActionLog actions={[]} />);
    expect(screen.getByText(/waiting for actions/i)).toBeInTheDocument();
  });

  it("highlights the first action as recent", () => {
    const actions = ["Latest Action", "Old Action"];
    const { container } = render(<ActionLog actions={actions} />);
    
    const latest = screen.getByText("Latest Action").closest('div');
    expect(latest).toHaveClass("bg-slate-800/50");
  });
});
