import { randomUUID } from "crypto";

import { currentTimestamp } from "../utils/dates";
import IRepository from "../interfaces/repo";
import { IRecord } from "../interfaces/basic";

export default class BaseRepository<T> implements IRepository<T> {
  public data: T[] = [];

  constructor(data: T[] = []) {
    this.data = data;
  };

  count = async (): Promise<number> => {
    return this.data.length;
  }

  find = async (filter: Partial<T>): Promise<T[]> => {
    return this.data.filter(item =>
      Object.entries(filter).every(([key, value]) =>
        item[key as keyof T] === value
      )
    );
  };

  findOne = async (filter: Partial<T>): Promise<T | undefined> => {
    return this.data.find(item =>
      Object.entries(filter).every(([key, value]) =>
        item[key as keyof T] === value
      )
    );
  };

  create = async (data: T): Promise<T | null> => {
    const payload = {
      order_id: randomUUID(),
      ...data,
      created_at: currentTimestamp(),
      updated_at: currentTimestamp(),
    };

    this.data.unshift(payload);
    return this.data[0] ?? null;
  }

  update = async (filter: Partial<T>, data: T): Promise<T | undefined> => {
    const existingRecord: IRecord = this.findOne(filter as T);
    if (!existingRecord) return undefined;

    const payload = {
      ...existingRecord,
      ...data,
      updated_at: currentTimestamp(),
    };

    const index = this.data.findIndex(v =>
      Object.entries(filter).every(([key, value]) =>
        v[key as keyof T] === value
      )
    );
    if (index !== -1) this.data[index] = payload;
    return this.data[index] ?? undefined;
  }
}
