
import React from 'react';
import { usePOS } from '@/contexts/POSContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, DollarSign, Users, ChefHat, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AdminView = () => {
  const { orders, tables, fetchOrders } = usePOS();
  const { toast } = useToast();

  const activeOrders = orders.filter(order => order.status !== 'served');
  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
  const occupiedTables = tables.filter(table => table.status === 'occupied').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-800';
      case 'preparing': return 'bg-blue-100 text-blue-800';
      case 'served': return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const updateOrderStatus = async (orderId: string, newStatus: 'pending' | 'preparing' | 'served') => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update order status",
          variant: "destructive"
        });
        return;
      }

      // If order is served, mark table as available
      if (newStatus === 'served') {
        const order = orders.find(o => o.id === orderId);
        if (order) {
          await supabase
            .from('tables')
            .update({ status: 'available' })
            .eq('id', order.table_id);
        }
      }

      await fetchOrders();
      toast({
        title: "Success",
        description: `Order status updated to ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Admin Dashboard</h2>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-100 rounded-lg">
                <Users className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Occupied Tables</p>
                <p className="text-2xl font-bold text-slate-800">{occupiedTables}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Revenue</p>
                <p className="text-2xl font-bold text-slate-800">${totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 rounded-lg">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Active Orders</p>
                <p className="text-2xl font-bold text-slate-800">{activeOrders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>Active Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {activeOrders.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No active orders</p>
          ) : (
            <div className="space-y-4">
              {activeOrders.map(order => (
                <div key={order.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-slate-800">
                        Table {order.table_id}
                      </h4>
                      <p className="text-sm text-slate-500">
                        {formatTime(new Date(order.created_at))}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                      <p className="text-lg font-bold text-slate-800 mt-1">
                        ${order.total.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{item.quantity}× {item.menuItem.name}</span>
                        <span>${(item.quantity * item.menuItem.price).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Order Status Management */}
                  <div className="flex gap-2 mt-4 pt-3 border-t">
                    {order.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => updateOrderStatus(order.id, 'preparing')}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <ChefHat className="w-3 h-3 mr-1" />
                        Start Preparing
                      </Button>
                    )}
                    {order.status === 'preparing' && (
                      <Button
                        size="sm"
                        onClick={() => updateOrderStatus(order.id, 'served')}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Mark Served
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminView;
