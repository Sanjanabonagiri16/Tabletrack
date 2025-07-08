
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Table, MenuItem, Order, OrderItem } from '@/types/pos';

interface POSContextType {
  tables: Table[];
  menuItems: MenuItem[];
  orders: Order[];
  updateTableStatus: (tableId: number, status: 'available' | 'occupied') => void;
  addOrder: (order: Order) => void;
}

const POSContext = createContext<POSContextType | undefined>(undefined);

// Demo data
const DEMO_TABLES: Table[] = Array.from({ length: 16 }, (_, i) => ({
  id: i + 1,
  status: Math.random() > 0.7 ? 'occupied' : 'available'
}));

const DEMO_MENU: MenuItem[] = [
  // Appetizers
  { id: 1, name: 'Caesar Salad', price: 12.99, category: 'Appetizers' },
  { id: 2, name: 'Garlic Bread', price: 8.99, category: 'Appetizers' },
  { id: 3, name: 'Buffalo Wings', price: 14.99, category: 'Appetizers' },
  
  // Main Courses
  { id: 4, name: 'Grilled Salmon', price: 24.99, category: 'Main Courses' },
  { id: 5, name: 'Ribeye Steak', price: 32.99, category: 'Main Courses' },
  { id: 6, name: 'Chicken Parmesan', price: 19.99, category: 'Main Courses' },
  { id: 7, name: 'Seafood Pasta', price: 22.99, category: 'Main Courses' },
  
  // Beverages
  { id: 8, name: 'House Wine', price: 8.99, category: 'Beverages' },
  { id: 9, name: 'Craft Beer', price: 6.99, category: 'Beverages' },
  { id: 10, name: 'Fresh Juice', price: 4.99, category: 'Beverages' },
  
  // Desserts
  { id: 11, name: 'Chocolate Cake', price: 9.99, category: 'Desserts' },
  { id: 12, name: 'Tiramisu', price: 11.99, category: 'Desserts' },
];

export const POSProvider = ({ children }: { children: ReactNode }) => {
  const [tables, setTables] = useState<Table[]>(DEMO_TABLES);
  const [orders, setOrders] = useState<Order[]>([]);
  const menuItems = DEMO_MENU;

  const updateTableStatus = (tableId: number, status: 'available' | 'occupied') => {
    setTables(prev => 
      prev.map(table => 
        table.id === tableId ? { ...table, status } : table
      )
    );
  };

  const addOrder = (order: Order) => {
    setOrders(prev => [...prev, order]);
    updateTableStatus(order.tableId, 'occupied');
  };

  return (
    <POSContext.Provider value={{
      tables,
      menuItems,
      orders,
      updateTableStatus,
      addOrder
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
