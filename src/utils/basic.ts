import { ISort } from "../interfaces/basic";

const sortedBy = <T, K extends keyof T>(
  array: T[],
  key: K,
  order: ISort = ISort.ASC
): T[] => {
  return [...array].sort((a, b) => {
    const valueA = a[key];
    const valueB = b[key];
    let compare: number;

    if (typeof valueA === 'string' && typeof valueB === 'string') {
      compare = valueA.localeCompare(valueB);
    } else if (typeof valueA === 'number' && typeof valueB === 'number') {
      compare = valueA as number - valueB as number;
    } else {
      compare = 0;
    }

    return order === ISort.DESC ? -compare : compare;
  });
};

export {
  sortedBy,
}
