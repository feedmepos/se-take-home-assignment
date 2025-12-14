import test from "node:test";
import assert from "assert";
import { orderCounter, botCounter } from "../src/helper/counter.js";

test("test function incrementBotCounter - check that counter increments as expected", () => {
  assert.deepStrictEqual(botCounter.incrementBotCounter(), 1);
  assert.deepStrictEqual(botCounter.incrementBotCounter(), 2);
});

test("test function getBotCounter - check that counter gets the same value as in previous test as it is a static", () => {
  assert.deepStrictEqual(botCounter.getBotCounter(), 2);
  assert.deepStrictEqual(botCounter.getBotCounter(), 2);
});

test("test function incrementOrderCounter - check that counter increments as expected", () => {
  assert.deepStrictEqual(orderCounter.incrementOrderCounter(), 1);
  assert.deepStrictEqual(orderCounter.incrementOrderCounter(), 2);
});

test("test function getOrderCounter - check that counter gets the same value as in previous test as it is a static", () => {
  assert.deepStrictEqual(orderCounter.getOrderCounter(), 2);
  assert.deepStrictEqual(orderCounter.getOrderCounter(), 2);
});


