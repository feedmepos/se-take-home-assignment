import test from "node:test";
import assert from "assert";
import { formatBotId, formatOrderId } from "../src/helper/formatter.js";

test("test function formatBotId - check formed botIds are as expected", () => {
  assert.deepStrictEqual(formatBotId(123), `123`);
  assert.deepStrictEqual(formatBotId(123), `123`);
});

test("test function formatOrderId - check formed orderIds are as expected", () => {
  assert.deepStrictEqual(formatOrderId(1), `0001`);
  assert.deepStrictEqual(formatOrderId(2), `0002`);
  assert.deepStrictEqual(formatOrderId(123), `0123`);
});