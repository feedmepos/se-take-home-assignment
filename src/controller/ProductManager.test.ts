import { describe, it, expect } from 'vitest';
import { productManager } from './ProductManager.js';
import { PREDEFINED_PRODUCTS } from './Product.js';

describe('ProductManager', () => {
  it('should be a singleton instance', () => {
    const anotherManager = productManager;
    expect(anotherManager).toBe(productManager);
  });

  it('should load all predefined products', () => {
    const products = productManager.getProducts();
    expect(products).toHaveLength(PREDEFINED_PRODUCTS.length);
  });

  it('should return correct product by ID', () => {
    const product = productManager.getProductById(1);
    expect(product).toBeDefined();
    expect(product?.name).toBe('Big Mac');
    expect(product?.nameCn).toBe('巨无霸');
  });

  it('should return undefined for non-existent product ID', () => {
    const product = productManager.getProductById(999);
    expect(product).toBeUndefined();
  });

  it('should return all predefined products with correct properties', () => {
    const products = productManager.getProducts();
    
    // 验证每个商品都有正确的属性
    products.forEach(product => {
      expect(product.id).toBeDefined();
      expect(product.name).toBeDefined();
      expect(product.nameCn).toBeDefined();
      expect(typeof product.price).toBe('number');
      expect(product.price).toBeGreaterThan(0);
      expect(product.category).toBeDefined();
    });
  });

  it('should return random product from the list', () => {
    const products = productManager.getProducts();
    const randomProduct = productManager.getRandomProduct();
    
    expect(randomProduct).toBeDefined();
    expect(products).toContainEqual(randomProduct);
  });

  it('should return products in the same order as predefined', () => {
    const products = productManager.getProducts();
    
    PREDEFINED_PRODUCTS.forEach((predefined, index) => {
      expect(products[index].id).toBe(predefined.id);
      expect(products[index].name).toBe(predefined.name);
    });
  });

  it('should have correct product data for all items', () => {
    const products = productManager.getProducts();
    
    const productMap = new Map(products.map(p => [p.id, p]));
    
    expect(productMap.get(1)?.name).toBe('Big Mac');
    expect(productMap.get(1)?.nameCn).toBe('巨无霸');
    expect(productMap.get(1)?.price).toBe(5.99);
    expect(productMap.get(1)?.category).toBe('burger');

    expect(productMap.get(2)?.name).toBe('French Fries');
    expect(productMap.get(2)?.nameCn).toBe('薯条');
    expect(productMap.get(2)?.price).toBe(2.99);
    expect(productMap.get(2)?.category).toBe('side');

    expect(productMap.get(3)?.name).toBe('Chicken McNuggets');
    expect(productMap.get(3)?.nameCn).toBe('麦乐鸡');
    expect(productMap.get(3)?.price).toBe(4.49);
    expect(productMap.get(3)?.category).toBe('chicken');

    expect(productMap.get(4)?.name).toBe('McFlurry');
    expect(productMap.get(4)?.nameCn).toBe('麦旋风');
    expect(productMap.get(4)?.price).toBe(3.29);
    expect(productMap.get(4)?.category).toBe('dessert');

    expect(productMap.get(5)?.name).toBe('Coca-Cola');
    expect(productMap.get(5)?.nameCn).toBe('可乐');
    expect(productMap.get(5)?.price).toBe(1.99);
    expect(productMap.get(5)?.category).toBe('beverage');
  });
});