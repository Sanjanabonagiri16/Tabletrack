-- Create demo users for testing (admin and waiter)
-- Note: These will be created through the signup process, but let's ensure we have tables 1-25

-- First, let's make sure we have exactly 25 tables for 5x5 grid
DELETE FROM public.tables WHERE id > 25;

-- Insert tables 1-25 if they don't exist
INSERT INTO public.tables (id, status) 
SELECT generate_series(1, 25), 'available'
ON CONFLICT (id) DO NOTHING;

-- Update any existing tables to ensure proper status
UPDATE public.tables SET status = 'available' WHERE id <= 25;