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
      // Fetch all menu items
      const { data: menuItems, error: menuError } = await supabase
        .from('menu_items')
        .select('*')
        .order('category, name')

      if (menuError) {
        console.error('Menu fetch error:', menuError)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch menu items' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Format menu items to match frontend expectations
      const formattedItems = menuItems.map(item => ({
        id: item.id,
        name: item.name,
        price: parseFloat(item.price.toString()),
        category: item.category
      }))

      return new Response(
        JSON.stringify({ menuItems: formattedItems }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'POST') {
      // Add new menu item (admin only)
      if (user.role !== 'admin') {
        return new Response(
          JSON.stringify({ error: 'Admin access required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { name, price, category } = await req.json()

      if (!name || !price || !category) {
        return new Response(
          JSON.stringify({ error: 'Name, price, and category are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: menuItem, error: insertError } = await supabase
        .from('menu_items')
        .insert({ name, price, category })
        .select()
        .single()

      if (insertError) {
        console.error('Menu item insert error:', insertError)
        return new Response(
          JSON.stringify({ error: 'Failed to create menu item' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ menuItem }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Menu API error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})