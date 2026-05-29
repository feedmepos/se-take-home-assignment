export interface Product {
  id: number;
  name: string;
  nameCn: string;
  price: number;
  category: string;
}

export const PREDEFINED_PRODUCTS: Product[] = [
  {
    id: 1,
    name: 'Big Mac',
    nameCn: '巨无霸',
    price: 5.99,
    category: 'burger',
  },
  {
    id: 2,
    name: 'French Fries',
    nameCn: '薯条',
    price: 2.99,
    category: 'side',
  },
  {
    id: 3,
    name: 'Chicken McNuggets',
    nameCn: '麦乐鸡',
    price: 4.49,
    category: 'chicken',
  },
  {
    id: 4,
    name: 'McFlurry',
    nameCn: '麦旋风',
    price: 3.29,
    category: 'dessert',
  },
  {
    id: 5,
    name: 'Coca-Cola',
    nameCn: '可乐',
    price: 1.99,
    category: 'beverage',
  },
];

export function formatProductName(product: Product): string {
  return `${product.name} (${product.nameCn})`;
}

export function formatProductPrice(product: Product): string {
  return `$${product.price.toFixed(2)}`;
}
