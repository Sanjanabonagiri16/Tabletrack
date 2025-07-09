-- Create demo users (admin and waiter)
-- Note: In production, these would be created through the signup process
-- This is just for testing purposes

-- First, let's create the auth users manually (this would typically be done through the signup process)
-- Since we can't directly insert into auth.users, we'll rely on the signup process

-- For now, let's ensure our tables are properly set up for the demo
-- We'll create the profiles when users sign up through the UI

-- Make sure we have some sample orders for demo
-- First, let's add a few sample occupied tables
UPDATE public.tables SET status = 'occupied' WHERE id IN (3, 7, 12, 18, 23);

-- Add some sample orders (these will be linked to real users once they sign up)
-- We'll add these through the application once users are created