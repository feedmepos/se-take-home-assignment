import { MenuItem } from '@/types';

export const MENU_ITEMS: MenuItem[] = [
  { id: 'big-mac', name: 'Big Mac', price: 5.99, category: 'burger' },
  { id: 'quarter-pounder', name: 'Quarter Pounder with Cheese', price: 6.49, category: 'burger' },
  { id: 'mcchicken', name: 'McChicken', price: 4.99, category: 'burger' },
  { id: 'filet-o-fish', name: 'Filet-O-Fish', price: 4.79, category: 'burger' },
  { id: 'cheeseburger', name: 'Cheeseburger', price: 2.49, category: 'burger' },
  { id: 'fries-small', name: 'Small Fries', price: 1.99, category: 'sides' },
  { id: 'fries-medium', name: 'Medium Fries', price: 2.49, category: 'sides' },
  { id: 'fries-large', name: 'Large Fries', price: 2.99, category: 'sides' },
  { id: 'mcnuggets-6', name: '6pc McNuggets', price: 4.49, category: 'sides' },
  { id: 'mcnuggets-10', name: '10pc McNuggets', price: 6.49, category: 'sides' },
  { id: 'coke-small', name: 'Small Coca-Cola', price: 1.49, category: 'drink' },
  { id: 'coke-medium', name: 'Medium Coca-Cola', price: 1.79, category: 'drink' },
  { id: 'coke-large', name: 'Large Coca-Cola', price: 1.99, category: 'drink' },
  { id: 'coffee', name: 'McCafé Coffee', price: 1.99, category: 'drink' },
  { id: 'milkshake', name: 'Vanilla Milkshake', price: 3.49, category: 'drink' },
];

export const getMenuItemById = (id: string): MenuItem | undefined => {
  return MENU_ITEMS.find(item => item.id === id);
};

export const getMenuItemsByCategory = (category: MenuItem['category']): MenuItem[] => {
  return MENU_ITEMS.filter(item => item.category === category);
};