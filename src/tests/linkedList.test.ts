import { OrderType } from "../lib/model";
import LinkedList from "../lib/model/linkedlist";
import { Order } from "../lib/model/order";
import { describe, expect, test } from "@jest/globals";

test("Empty list is initialized correctly", () => {
  const list = new LinkedList<Order>();

  expect(list.size).toBe(0);
  expect(list.isEmpty).toBe(true);
});

test("Enqueue a single value into list is valid", () => {
  const list = new LinkedList<Order>();

  expect(list.size).toBe(0);
  expect(list.isEmpty).toBe(true);

  const o1 = new Order(1, OrderType.NORMAL);
  list.enqueue(o1);

  expect(list.size).toBe(1);
  expect(list.isEmpty).toBe(false);

  const all = list.toArray();
  expect(all[0]).toBe(o1);
});

test("Dequeue value in an empty list returns undefined", () => {
  const list = new LinkedList<Order>();

  expect(list.size).toBe(0);
  expect(list.isEmpty).toBe(true);

  const value = list.dequeue();
  expect(value).toBe(undefined);
});

test("enqueueFront places value to the front of the list", () => {
  const list = new LinkedList<Order>();

  expect(list.size).toBe(0);
  expect(list.isEmpty).toBe(true);

  const o1 = new Order(1, OrderType.NORMAL);
  list.enqueue(o1);
  const o2 = new Order(2, OrderType.NORMAL);
  list.enqueueFront(o2);

  const all = list.toArray();
  expect(all[0].id).toBe(2);
  expect(all[1].id).toBe(1);
});
