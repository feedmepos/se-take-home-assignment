export default class BaseMemory {
  private static instance: BaseMemory;
  private storage: Map<string, any[]> = new Map();

  private constructor() {}

  static getInstance(): BaseMemory {
    if (!BaseMemory.instance) BaseMemory.instance = new BaseMemory();
    return BaseMemory.instance;
  }

  /**
   * Get or create a storage collection by collection name
   */
  private getCollection<T>(collectionName: string): T[] {
    if (!this.storage.has(collectionName)) this.storage.set(collectionName, []);
    return this.storage.get(collectionName) as T[];
  }

  /**
   * Add object to collection
   */
  create<T>(collectionName: string, item: T): void {
    const collection = this.getCollection<T>(collectionName);
    collection.unshift(item);
  }

  /**
   * Get all items from collection
   */
  // findAll<T>(collectionName: string, predicate: (item: T) => boolean): T[] {
  //   return this.getCollection<T>(collectionName).filter(predicate);
  // }
  findAll<T>(collectionName: string, filter: Partial<T>): T[] {
    return this.getCollection<T>(collectionName).filter(item =>
      Object.entries(filter).every(([key, value]) =>
        item[key as keyof T] === value
      )
    );
  }

  /**
   * Get specific item from collection
   */
  // find<T>(collectionName: string, predicate: (item: T) => boolean): T | undefined {
  //   return this.getCollection<T>(collectionName).find(predicate);
  // }
  find<T>(collectionName: string, filter: Partial<T>): T | undefined {
    return this.getCollection<T>(collectionName).find(item =>
      Object.entries(filter).every(([key, value]) =>
        item[key as keyof T] === value
      )
    );
  }

  /**
   * Update specific item from collection
   */
  // update<T>(collectionName: string, predicate: (item: T) => boolean, payload: T): boolean {
  //   const collection = this.getCollection<T>(collectionName);
  //   const index = collection.findIndex(predicate);

  //   if (index !== -1) {
  //     collection[index] = payload;
  //     return true;
  //   }
  //   return false;
  // }
  update<T>(collectionName: string, filter: Partial<T>, payload: T): boolean {
    const collection = this.getCollection<T>(collectionName);
    const index = collection.findIndex(v =>
      Object.entries(filter).every(([key, value]) =>
        v[key as keyof T] === value
      )
    );

    if (index !== -1) {
      collection[index] = payload;
      return true;
    }
    return false;
  }

  /**
   * Delete specific item from collection 
   */
  delete<T>(collectionName: string, predicate: (item: T) => boolean): boolean {
    const collection = this.getCollection<T>(collectionName);
    const index = collection.findIndex(predicate);

    if (index !== -1) {
      collection.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * To clear specific collection
   */
  clear(collectionName: string): void {
    this.storage.set(collectionName, []);
  }
}
