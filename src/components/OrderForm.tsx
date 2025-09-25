"use client";

import { useReducer } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getMenuItemsByCategory } from '@/lib/menuData';
import { OrderItem, MenuItem } from '@/types';
import { orderFormReducer, initialFormState, calculateTotal } from '@/lib/orderFormReducer';

interface OrderFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (items: OrderItem[], orderType: 'normal' | 'vip') => void;
  orderType: 'normal' | 'vip';
}

export function OrderForm({ isOpen, onClose, onSubmit, orderType }: OrderFormProps) {
  const [state, dispatch] = useReducer(orderFormReducer, initialFormState);
  const { selectedItems, selectedCategory } = state;

  const addItem = (menuItem: MenuItem) => {
    dispatch({ type: 'ADD_ITEM', payload: { menuItem } });
  };

  const removeItem = (menuItemId: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: { menuItemId } });
  };

  const updateQuantity = (menuItemId: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { menuItemId, quantity } });
  };

  const setSelectedCategory = (category: 'burger' | 'sides' | 'drink') => {
    dispatch({ type: 'SET_CATEGORY', payload: { category } });
  };

  const handleSubmit = () => {
    if (selectedItems.length === 0) {
      return;
    }

    onSubmit(selectedItems, orderType);

    dispatch({ type: 'RESET_FORM' });
    onClose();
  };

  const total = calculateTotal(selectedItems);
  const canSubmit = selectedItems.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 min-h-[2rem]">
            <span className="min-w-[180px]">New {orderType.toUpperCase()} Order</span>
            <div className="w-12">
              {orderType === 'vip' && <Badge className="bg-yellow-600">VIP</Badge>}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold">Select Items</h3>

              <Select value={selectedCategory} onValueChange={(value: 'burger' | 'sides' | 'drink') => setSelectedCategory(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="burger">Burgers</SelectItem>
                  <SelectItem value="sides">Sides</SelectItem>
                  <SelectItem value="drink">Drinks</SelectItem>
                </SelectContent>
              </Select>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-h-[320px]">
                {getMenuItemsByCategory(selectedCategory).map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg h-[70px]">
                    <div className="flex-1">
                      <div className="font-medium text-sm leading-tight">{item.name}</div>
                      <div className="text-sm text-green-600 mt-1">${item.price.toFixed(2)}</div>
                    </div>
                    <Button onClick={() => addItem(item)} size="sm" variant="outline" className="ml-2 shrink-0">
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-4 min-h-[200px]">
              <h3 className="font-semibold">Order Summary</h3>
              {selectedItems.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  No items selected
                </div>
              ) : (
                <div className="space-y-2 min-h-[120px]">
                  {selectedItems.map(item => (
                    <div key={item.menuItem.id} className="flex items-center justify-between p-2 border rounded min-h-[60px]">
                      <div className="flex-1">
                        <div className="font-medium">{item.menuItem.name}</div>
                        <div className="text-sm text-muted-foreground">
                          ${item.menuItem.price.toFixed(2)} each
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => updateQuantity(item.menuItem.id, item.quantity - 1)}
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0 shrink-0"
                        >
                          -
                        </Button>
                        <span className="w-8 text-center shrink-0">{item.quantity}</span>
                        <Button
                          onClick={() => updateQuantity(item.menuItem.id, item.quantity + 1)}
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0 shrink-0"
                        >
                          +
                        </Button>
                        <Button
                          onClick={() => removeItem(item.menuItem.id)}
                          size="sm"
                          variant="destructive"
                          className="h-8 w-16 text-xs shrink-0"
                        >
                          Remove
                        </Button>
                      </div>
                      <div className="w-20 text-right font-medium shrink-0">
                        ${(item.menuItem.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {selectedItems.length > 0 && (
                <div className="flex justify-between items-center pt-2 border-t h-10">
                  <span className="font-semibold">Total:</span>
                  <span className="font-semibold text-lg">${total.toFixed(2)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={orderType === 'vip' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
            >
              Place {orderType.toUpperCase()} Order
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}