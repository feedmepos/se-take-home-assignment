import { expect, it } from "vite-plus/test";
import { render } from "vitest-browser-react";
import App from "./App";

it("drives the order controller UI in a browser", async () => {
  const screen = await render(<App />);
  const pending = screen.getByRole("region", { name: "Pending area" });
  const bots = screen.getByRole("region", { name: "Cooking bots" });
  const complete = screen.getByRole("region", { name: "Complete area" });

  await screen.getByRole("button", { name: "New Normal Order" }).click();
  await screen.getByRole("button", { name: "New Normal Order" }).click();
  await screen.getByRole("button", { name: "New VIP Order" }).click();

  await expect.element(pending.getByText("Order #3", { exact: true })).toBeVisible();
  await expect.element(pending.getByText("Queue position 1")).toBeVisible();

  await screen.getByRole("button", { name: "+ Bot" }).click();

  await expect.element(bots.getByText("Cooking Order #3")).toBeVisible();
  await expect.element(pending.getByText("Queue position 1")).toBeVisible();

  await screen.getByRole("button", { name: "- Bot #1" }).click();

  await expect.element(pending.getByText("Queue position 1")).toBeVisible();
  await expect.element(pending.getByText("Order #3", { exact: true })).toBeVisible();

  await screen.getByRole("button", { name: "+ Bot" }).click();
  await screen.getByRole("button", { name: "+ Bot" }).click();
  await screen.getByRole("button", { name: "+ Bot" }).click();

  await expect.element(bots.getByText("Cooking Order #3")).toBeVisible();
  await new Promise((resolve) => window.setTimeout(resolve, 10_500));
  await expect.element(complete.getByText("Order #1", { exact: true })).toBeVisible();
  await expect.element(complete.getByText("Order #2", { exact: true })).toBeVisible();
  await expect.element(complete.getByText("Order #3", { exact: true })).toBeVisible();
  await expect.element(pending.getByText("No pending orders")).toBeVisible();
});
