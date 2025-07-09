import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function to verify JWT token and get user
async function verifyUser(authHeader: string | null, supabase: any) {
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Missing or invalid authorization header' }
  }

  const token = authHeader.replace('Bearer ', '')
  
  const { data: { user }, error } = await supabase.auth.getUser(token)
  
  if (error || !user) {
    return { error: 'Invalid token' }
  }

  // Get user profile with role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile) {
    return { error: 'User profile not found' }
  }

  return { 
    user: {
      id: user.id,
      email: user.email,
      username: profile.username,
      role: profile.role,
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify authentication
    const authHeader = req.headers.get('authorization')
    const { user, error: authError } = await verifyUser(authHeader, supabase)
    
    if (authError) {
      return new Response(
        JSON.stringify({ error: authError }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'GET') {
      // Fetch orders (admin can see all, waiters can see their own)
      let query = supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            menu_items (*)
          )
        `)
        .order('created_at', { ascending: false })

      // If user is not admin, only show their orders
      if (user.role !== 'admin') {
        query = query.eq('user_id', user.id)
      }

      const { data: orders, error: ordersError } = await query

      if (ordersError) {
        console.error('Orders fetch error:', ordersError)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch orders' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Format orders to match frontend expectations
      const formattedOrders = orders.map(order => ({
        id: order.id,
        table_id: order.table_id,
        total: parseFloat(order.total.toString()),
        status: order.status,
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
      }))

      return new Response(
        JSON.stringify({ orders: formattedOrders }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'POST') {
      // Create new order
      const { tableId, items } = await req.json()

      if (!tableId || !items || !Array.isArray(items) || items.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Table ID and items are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if table is available
      const { data: table, error: tableError } = await supabase
        .from('tables')
        .select('*')
        .eq('id', tableId)
        .single()

      if (tableError || !table) {
        return new Response(
          JSON.stringify({ error: 'Table not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Calculate total
      const total = items.reduce((sum: number, item: any) => 
        sum + (item.menuItem.price * item.quantity), 0
      )

      // Create order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          table_id: tableId,
          user_id: user.id,
          total,
          status: 'pending'
        })
        .select()
        .single()

      if (orderError || !orderData) {
        console.error('Order creation error:', orderError)
        return new Response(
          JSON.stringify({ error: 'Failed to create order' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Create order items
      const orderItems = items.map((item: any) => ({
        order_id: orderData.id,
        menu_item_id: item.menuItem.id,
        quantity: item.quantity,
        price: item.menuItem.price
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) {
        console.error('Order items creation error:', itemsError)
        // Rollback: delete the order
        await supabase.from('orders').delete().eq('id', orderData.id)
        return new Response(
          JSON.stringify({ error: 'Failed to create order items' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update table status to occupied
      await supabase
        .from('tables')
        .update({ status: 'occupied' })
        .eq('id', tableId)

      return new Response(
        JSON.stringify({ 
          order: orderData,
          message: 'Order created successfully'
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'PUT') {
      // Update order status (admin only)
      if (user.role !== 'admin') {
        return new Response(
          JSON.stringify({ error: 'Admin access required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { orderId, status } = await req.json()

      if (!orderId || !status || !['pending', 'preparing', 'served'].includes(status)) {
        return new Response(
          JSON.stringify({ error: 'Invalid order ID or status' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: order, error: updateError } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId)
        .select()
        .single()

      if (updateError) {
        console.error('Order update error:', updateError)
        return new Response(
          JSON.stringify({ error: 'Failed to update order status' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // If order is served, mark table as available
      if (status === 'served') {
        await supabase
          .from('tables')
          .update({ status: 'available' })
          .eq('id', order.table_id)
      }

      return new Response(
        JSON.stringify({ order }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Orders API error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})