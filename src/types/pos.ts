
export interface User {
  id: string;
  username: string;
  role: 'waiter' | 'admin';
}

export interface Table {
  id: number;
  status: 'available' | 'occupied';
}

export interface MenuItem {
  id: number;
  name: string;
  price: number;
  category: string;
}

export interface OrderItem {
  menuItem: MenuItem;
  quantity: number;
}

export interface Order {
  id: string;
  table_id: number;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'preparing' | 'served';
  created_at: string;
}
