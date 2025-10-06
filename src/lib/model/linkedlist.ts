import { ListNode } from "./listnode";

export default class LinkedList<T> {
  private head: ListNode<T> | null = null;
  private tail: ListNode<T> | null = null;
  private _size = 0;

  enqueue(value: T): void {
    const node = new ListNode(value);
    if (!this.tail) {
      // List is empty; Set as both head and tail
      this.head = this.tail = node;
    } else {
      // Add node to tail of list
      this.tail.next = node;
      node.prev = this.tail;
      this.tail = node;
    }
    this._size++;
  }

  enqueueFront(value: T): void {
    const node = new ListNode(value);
    if (!this.head) {
      // List is empty; Set as both head and tail
      this.head = this.tail = node;
    } else {
      // Add node to head of list
      node.next = this.head;
      this.head.prev = node;
      this.head = node;
    }
    this._size++;
  }

  dequeue(): T | undefined {
    if (!this.head) return undefined;
    const prevHead = this.head;
    // Update head of list
    this.head = this.head.next;
    if (this.head) {
      // Remove connections to prev head of list
      this.head.prev = null;
    } else {
      // List is empty; Set tail to null accordingly
      this.tail = null;
    }
    this._size--;
    // Clear references to prevent memory leaks
    prevHead.next = null;
    prevHead.prev = null;
    return prevHead.value;
  }

  toArray() {
    const values: T[] = [];
    let node = this.head;
    while (node != null) {
        values.push(node.value);
        node = node.next;
    }
    return values;
  }

  get size(): number {
    return this._size;
  }

  get isEmpty(): boolean {
    return this._size === 0;
  }
}
