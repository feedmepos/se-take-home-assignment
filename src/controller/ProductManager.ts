import type { Product } from './Product.js';
import { PREDEFINED_PRODUCTS } from './Product.js';

class ProductManagerClass {
  private products: Map<number, Product> = new Map();

  constructor() {
    this.loadProducts();
  }

  private loadProducts(): void {
    for (const product of PREDEFINED_PRODUCTS) {
      this.products.set(product.id, product);
    }
  }

  getProducts(): Product[] {
    return Array.from(this.products.values());
  }

  getProductById(id: number): Product | undefined {
    return this.products.get(id);
  }

  getRandomProduct(): Product {
    const allProducts = this.getProducts();
    const randomIndex = Math.floor(Math.random() * allProducts.length);
    return allProducts[randomIndex];
  }
}

export const productManager = new ProductManagerClass();
