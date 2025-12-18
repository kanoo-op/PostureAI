/**
 * Generic circular buffer for fixed-size history storage
 * Used to store joint position history without memory growth
 */
export class CircularBuffer<T> {
  private buffer: (T | undefined)[];
  private head: number = 0; // Next write position
  private count: number = 0;
  private readonly capacity: number;

  constructor(capacity: number) {
    if (capacity < 1) throw new Error('Capacity must be at least 1');
    this.capacity = capacity;
    this.buffer = new Array(capacity);
  }

  /**
   * Add item to buffer, overwriting oldest if full
   */
  push(item: T): void {
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) {
      this.count++;
    }
  }

  /**
   * Get item by index (0 = oldest)
   */
  get(index: number): T | undefined {
    if (index < 0 || index >= this.count) {
      return undefined;
    }
    // Calculate actual position: start from tail (oldest)
    const tail = this.count < this.capacity ? 0 : this.head;
    const actualIndex = (tail + index) % this.capacity;
    return this.buffer[actualIndex];
  }

  /**
   * Get latest n items (default: all), newest last
   */
  getLatest(n?: number): T[] {
    const count = n !== undefined ? Math.min(n, this.count) : this.count;
    const result: T[] = [];

    for (let i = this.count - count; i < this.count; i++) {
      const item = this.get(i);
      if (item !== undefined) {
        result.push(item);
      }
    }

    return result;
  }

  /**
   * Get the most recent item
   */
  peek(): T | undefined {
    if (this.count === 0) return undefined;
    const lastIndex = (this.head - 1 + this.capacity) % this.capacity;
    return this.buffer[lastIndex];
  }

  /**
   * Get the second most recent item (for velocity calculation)
   */
  peekPrevious(): T | undefined {
    if (this.count < 2) return undefined;
    const prevIndex = (this.head - 2 + this.capacity) % this.capacity;
    return this.buffer[prevIndex];
  }

  /**
   * Reset buffer
   */
  clear(): void {
    this.buffer = new Array(this.capacity);
    this.head = 0;
    this.count = 0;
  }

  get size(): number {
    return this.count;
  }

  get isFull(): boolean {
    return this.count === this.capacity;
  }

  /**
   * Iterator support for for...of loops (oldest to newest)
   */
  *[Symbol.iterator](): Iterator<T> {
    for (let i = 0; i < this.count; i++) {
      const item = this.get(i);
      if (item !== undefined) {
        yield item;
      }
    }
  }
}
