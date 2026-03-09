import { render, screen } from "@testing-library/react";
import { StatCard } from "@/components/StatCard";
import "@testing-library/jest-dom";
import { Bot } from "lucide-react";

describe("StatCard Component", () => {
  it("renders label and value correctly", () => {
    render(
      <StatCard 
        icon={<Bot data-testid="bot-icon" />} 
        label="Test Label" 
        value={42} 
        color="blue" 
      />
    );

    expect(screen.getByText("Test Label")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByTestId("bot-icon")).toBeInTheDocument();
  });

  it("applies the correct color class", () => {
    const { container } = render(
      <StatCard 
        icon={<Bot />} 
        label="Test" 
        value={1} 
        color="emerald" 
      />
    );

    const iconWrapper = container.querySelector(".bg-emerald-50");
    expect(iconWrapper).toBeInTheDocument();
  });
});
