export default interface IRepository<T> {
  count(filter: T): Promise<number>;
  find(filter: T): Promise<T[] | null>;
  findOne(filter: T): Promise<T | undefined>;
  create(data: T): Promise<T | null>;
  update(filter: Partial<T>, data: T): Promise<T | undefined>;
}
