import React from "react";
import { render, screen } from "@testing-library/react";
import App from "./App";

// The original test was looking for 'learn react' which doesn't exist in our UI
// Replacing with a test that checks for the footer text instead
test("renders footer text", () => {
  render(<App />);
  const footerElement = screen.getByText(
    /FeedMe Software Engineer Take Home Assignment/i
  );
  expect(footerElement).toBeInTheDocument();
});

test("renders McDonald's Order Processing System heading", () => {
  render(<App />);
  const headingElement = screen.getByText(
    /McDonald's Order Processing System/i
  );
  expect(headingElement).toBeInTheDocument();
});
