
import React, { useState } from 'react';
import { usePOS } from '@/contexts/POSContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Plus, Minus, ShoppingCart } from 'lucide-react';
import { MenuItem, OrderItem, Order } from '@/types/pos';
import { useToast } from '@/hooks/use-toast';

interface OrderPlacementProps {
  tableId: number;
  onBack: () => void;
}

const OrderPlacement = ({ tableId, onBack }: OrderPlacementProps) => {
  const { menuItems, addOrder } = usePOS();
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const { toast } = useToast();

  const categories = [...new Set(menuItems.map(item => item.category))];

  const addToOrder = (menuItem: MenuItem) => {
    setOrderItems(prev => {
      const existing = prev.find(item => item.menuItem.id === menuItem.id);
      if (existing) {
        return prev.map(item =>
          item.menuItem.id === menuItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { menuItem, quantity: 1 }];
    });
  };

  const removeFromOrder = (menuItemId: number) => {
    setOrderItems(prev => {
      const existing = prev.find(item => item.menuItem.id === menuItemId);
      if (existing && existing.quantity > 1) {
        return prev.map(item =>
          item.menuItem.id === menuItemId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        );
      }
      return prev.filter(item => item.menuItem.id !== menuItemId);
    });
  };

  const getQuantity = (menuItemId: number) => {
    const item = orderItems.find(item => item.menuItem.id === menuItemId);
    return item ? item.quantity : 0;
  };

  const getTotalPrice = () => {
    return orderItems.reduce((total, item) => 
      total + (item.menuItem.price * item.quantity), 0
    );
  };

  const handlePlaceOrder = async () => {
    if (orderItems.length === 0) {
      toast({
        title: "Empty Order",
        description: "Please add items to your order",
        variant: "destructive"
      });
      return;
    }

    try {
      await addOrder(tableId, orderItems);
      toast({
        title: "Order Placed",
        description: `Order for Table ${tableId} has been placed successfully`,
      });
      onBack();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to place order. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Tables
        </Button>
        <h2 className="text-2xl font-bold text-slate-800">
          Order for Table {tableId}
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Menu Items */}
        <div className="lg:col-span-2 space-y-6">
          {categories.map(category => (
            <div key={category}>
              <h3 className="text-lg font-semibold text-slate-700 mb-3">{category}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {menuItems
                  .filter(item => item.category === category)
                  .map(item => (
                    <Card key={item.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-slate-800">{item.name}</h4>
                          <Badge variant="secondary">${item.price.toFixed(2)}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => removeFromOrder(item.id)}
                              disabled={getQuantity(item.id) === 0}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center">{getQuantity(item.id)}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => addToOrder(item)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              {orderItems.length === 0 ? (
                <p className="text-slate-500 text-center py-4">No items added yet</p>
              ) : (
                <div className="space-y-3">
                  {orderItems.map(item => (
                    <div key={item.menuItem.id} className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{item.menuItem.name}</div>
                        <div className="text-sm text-slate-500">
                          {item.quantity} × ${item.menuItem.price.toFixed(2)}
                        </div>
                      </div>
                      <div className="font-medium">
                        ${(item.quantity * item.menuItem.price).toFixed(2)}
                      </div>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between items-center font-bold text-lg">
                    <span>Total</span>
                    <span>${getTotalPrice().toFixed(2)}</span>
                  </div>
                  <Button 
                    className="w-full bg-indigo-600 hover:bg-indigo-700" 
                    onClick={handlePlaceOrder}
                  >
                    Place Order
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OrderPlacement;
