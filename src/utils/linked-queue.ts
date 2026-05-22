/**
 * Node class for the linked list queue
 */
class QueueNode<T> {
  constructor(
    public value: T,
    public next: QueueNode<T> | null = null
  ) {}
}

/**
 * LinkedQueue - A queue implementation using a singly linked list
 * Provides O(1) time complexity for enqueue, dequeue, and enqueueFront operations
 */
export class LinkedQueue<T> {
  private head: QueueNode<T> | null = null;
  private tail: QueueNode<T> | null = null;
  private size: number = 0;

  /**
   * Add an element to the back of the queue
   * Time complexity: O(1)
   */
  enqueue(value: T): void {
    const node = new QueueNode(value);

    if (!this.tail) {
      // Queue is empty
      this.head = this.tail = node;
    } else {
      // Add to the end
      this.tail.next = node;
      this.tail = node;
    }

    this.size++;
  }

  /**
   * Remove and return the element from the front of the queue
   * Time complexity: O(1)
   */
  dequeue(): T | undefined {
    if (!this.head) {
      return undefined;
    }

    const value = this.head.value;
    this.head = this.head.next;

    if (!this.head) {
      // Queue is now empty
      this.tail = null;
    }

    this.size--;
    return value;
  }

  /**
   * Add an element to the front of the queue (for high-priority items)
   * Time complexity: O(1)
   */
  enqueueFront(value: T): void {
    const node = new QueueNode(value);

    if (!this.head) {
      // Queue is empty
      this.head = this.tail = node;
    } else {
      // Add to the front
      node.next = this.head;
      this.head = node;
    }

    this.size++;
  }

  /**
   * Peek at the front element without removing it
   * Time complexity: O(1)
   */
  peek(): T | undefined {
    return this.head?.value;
  }

  /**
   * Check if the queue is empty
   * Time complexity: O(1)
   */
  isEmpty(): boolean {
    return this.size === 0;
  }

  /**
   * Get the number of elements in the queue
   * Time complexity: O(1)
   */
  get length(): number {
    return this.size;
  }

  /**
   * Convert the queue to an array (for display purposes)
   * Time complexity: O(n)
   */
  toArray(): T[] {
    const result: T[] = [];
    let current = this.head;

    while (current) {
      result.push(current.value);
      current = current.next;
    }

    return result;
  }

  /**
   * Clear all elements from the queue
   * Time complexity: O(1)
   */
  clear(): void {
    this.head = null;
    this.tail = null;
    this.size = 0;
  }
}
