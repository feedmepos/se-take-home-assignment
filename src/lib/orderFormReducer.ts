import { OrderItem, MenuItem } from '@/types';

export interface OrderFormState {
  selectedItems: OrderItem[];
  selectedCategory: 'burger' | 'sides' | 'drink';
}

export type OrderFormAction =
  | { type: 'ADD_ITEM'; payload: { menuItem: MenuItem } }
  | { type: 'REMOVE_ITEM'; payload: { menuItemId: string } }
  | { type: 'UPDATE_QUANTITY'; payload: { menuItemId: string; quantity: number } }
  | { type: 'SET_CATEGORY'; payload: { category: 'burger' | 'sides' | 'drink' } }
  | { type: 'RESET_FORM' };

export const initialFormState: OrderFormState = {
  selectedItems: [],
  selectedCategory: 'burger',
};

export function orderFormReducer(state: OrderFormState, action: OrderFormAction): OrderFormState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const { menuItem } = action.payload;
      const existingIndex = state.selectedItems.findIndex(item => item.menuItem.id === menuItem.id);
      
      if (existingIndex >= 0) {
        const newItems = [...state.selectedItems];
        newItems[existingIndex] = {
          ...newItems[existingIndex],
          quantity: newItems[existingIndex].quantity + 1,
        };
        return { ...state, selectedItems: newItems };
      } else {
        return {
          ...state,
          selectedItems: [...state.selectedItems, { menuItem, quantity: 1 }],
        };
      }
    }

    case 'REMOVE_ITEM': {
      const { menuItemId } = action.payload;
      return {
        ...state,
        selectedItems: state.selectedItems.filter(item => item.menuItem.id !== menuItemId),
      };
    }

    case 'UPDATE_QUANTITY': {
      const { menuItemId, quantity } = action.payload;
      
      if (quantity <= 0) {
        return {
          ...state,
          selectedItems: state.selectedItems.filter(item => item.menuItem.id !== menuItemId),
        };
      }
      
      const newItems = state.selectedItems.map(item =>
        item.menuItem.id === menuItemId ? { ...item, quantity } : item
      );
      
      return { ...state, selectedItems: newItems };
    }

    case 'SET_CATEGORY': {
      const { category } = action.payload;
      return { ...state, selectedCategory: category };
    }

    case 'RESET_FORM': {
      return initialFormState;
    }

    default:
      return state;
  }
}

export const calculateTotal = (items: OrderItem[]): number => {
  return items.reduce((total, item) => total + (item.menuItem.price * item.quantity), 0);
};