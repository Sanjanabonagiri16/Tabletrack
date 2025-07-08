import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, MenuItem, Order, OrderItem } from '@/types/pos';
import { useAuth } from './AuthContext';

interface POSContextType {
  tables: Table[];
  menuItems: MenuItem[];
  orders: Order[];
  loading: boolean;
  updateTableStatus: (tableId: number, status: 'available' | 'occupied') => Promise<void>;
  addOrder: (tableId: number, items: OrderItem[]) => Promise<void>;
  fetchOrders: () => Promise<void>;
}

const POSContext = createContext<POSContextType | undefined>(undefined);

export const POSProvider = ({ children }: { children: ReactNode }) => {
  const [tables, setTables] = useState<Table[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, session } = useAuth();

  // Fetch tables
  const fetchTables = async () => {
    if (!session) return;
    
    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .order('id');
    
    if (data && !error) {
      setTables(data.map(table => ({
        id: table.id,
        status: table.status as 'available' | 'occupied'
      })));
    }
  };

  // Fetch menu items
  const fetchMenuItems = async () => {
    if (!session) return;
    
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .order('category, name');
    
    if (data && !error) {
      setMenuItems(data);
    }
  };

  // Fetch orders with items
  const fetchOrders = async () => {
    if (!session) return;
    
    const { data: ordersData, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          menu_items (*)
        )
      `)
      .order('created_at', { ascending: false });
    
    if (ordersData && !error) {
      const formattedOrders: Order[] = ordersData.map(order => ({
        id: order.id,
        table_id: order.table_id,
        total: parseFloat(order.total.toString()),
        status: order.status as 'pending' | 'preparing' | 'served',
        created_at: order.created_at,
        items: order.order_items.map((item: any) => ({
          menuItem: {
            id: item.menu_items.id,
            name: item.menu_items.name,
            price: parseFloat(item.menu_items.price.toString()),
            category: item.menu_items.category
          },
          quantity: item.quantity
        }))
      }));
      setOrders(formattedOrders);
    }
  };

  // Update table status
  const updateTableStatus = async (tableId: number, status: 'available' | 'occupied') => {
    if (!session) return;
    
    const { error } = await supabase
      .from('tables')
      .update({ status })
      .eq('id', tableId);
    
    if (!error) {
      setTables(prev => 
        prev.map(table => 
          table.id === tableId ? { ...table, status } : table
        )
      );
    }
  };

  // Add new order
  const addOrder = async (tableId: number, items: OrderItem[]) => {
    if (!session || !user) return;
    
    const total = items.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0);
    
    // Create order
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        table_id: tableId,
        user_id: session.user.id,
        total,
        status: 'pending'
      })
      .select()
      .single();
    
    if (orderError || !orderData) return;
    
    // Create order items
    const orderItems = items.map(item => ({
      order_id: orderData.id,
      menu_item_id: item.menuItem.id,
      quantity: item.quantity,
      price: item.menuItem.price
    }));
    
    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);
    
    if (!itemsError) {
      // Update table status to occupied
      await updateTableStatus(tableId, 'occupied');
      // Refresh orders
      await fetchOrders();
    }
  };

  // Load data when user is authenticated
  useEffect(() => {
    if (session && user) {
      Promise.all([
        fetchTables(),
        fetchMenuItems(),
        fetchOrders()
      ]).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [session, user]);

  return (
    <POSContext.Provider value={{
      tables,
      menuItems,
      orders,
      loading,
      updateTableStatus,
      addOrder,
      fetchOrders
    }}>
      {children}
    </POSContext.Provider>
  );
};

export const usePOS = () => {
  const context = useContext(POSContext);
  if (context === undefined) {
    throw new Error('usePOS must be used within a POSProvider');
  }
  return context;
};