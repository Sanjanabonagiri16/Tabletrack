-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('waiter', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create tables table
CREATE TABLE public.tables (
  id INTEGER NOT NULL PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;

-- Create policies for tables (viewable by authenticated users)
CREATE POLICY "Authenticated users can view tables" 
ON public.tables 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can update table status" 
ON public.tables 
FOR UPDATE 
TO authenticated
USING (true);

-- Create menu_items table
CREATE TABLE public.menu_items (
  id INTEGER NOT NULL DEFAULT nextval('menu_items_id_seq'::regclass) PRIMARY KEY,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sequence for menu_items
CREATE SEQUENCE IF NOT EXISTS menu_items_id_seq;

-- Enable RLS
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- Create policies for menu_items (viewable by authenticated users)
CREATE POLICY "Authenticated users can view menu items" 
ON public.menu_items 
FOR SELECT 
TO authenticated
USING (true);

-- Create orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_id INTEGER NOT NULL REFERENCES public.tables(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  total DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'served')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create policies for orders
CREATE POLICY "Users can view all orders" 
ON public.orders 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Users can create orders" 
ON public.orders 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update orders" 
ON public.orders 
FOR UPDATE 
TO authenticated
USING (true);

-- Create order_items table
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id INTEGER NOT NULL REFERENCES public.menu_items(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Create policies for order_items
CREATE POLICY "Users can view order items" 
ON public.order_items 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Users can create order items" 
ON public.order_items 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tables_updated_at
  BEFORE UPDATE ON public.tables
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data ->> 'role', 'waiter')
  );
  RETURN new;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert demo tables (1-16)
INSERT INTO public.tables (id) 
SELECT generate_series(1, 16);

-- Insert demo menu items
INSERT INTO public.menu_items (name, price, category) VALUES
-- Appetizers
('Caesar Salad', 12.99, 'Appetizers'),
('Garlic Bread', 8.99, 'Appetizers'),
('Buffalo Wings', 14.99, 'Appetizers'),

-- Main Courses
('Grilled Salmon', 24.99, 'Main Courses'),
('Ribeye Steak', 32.99, 'Main Courses'),
('Chicken Parmesan', 19.99, 'Main Courses'),
('Seafood Pasta', 22.99, 'Main Courses'),

-- Beverages
('House Wine', 8.99, 'Beverages'),
('Craft Beer', 6.99, 'Beverages'),
('Fresh Juice', 4.99, 'Beverages'),

-- Desserts
('Chocolate Cake', 9.99, 'Desserts'),
('Tiramisu', 11.99, 'Desserts');