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
      // Fetch all tables
      const { data: tables, error: tablesError } = await supabase
        .from('tables')
        .select('*')
        .order('id')

      if (tablesError) {
        console.error('Tables fetch error:', tablesError)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch tables' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ tables }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'PUT') {
      // Update table status (for admin/waiter)
      const { tableId, status } = await req.json()

      if (!tableId || !status || !['available', 'occupied'].includes(status)) {
        return new Response(
          JSON.stringify({ error: 'Invalid table ID or status' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: table, error: updateError } = await supabase
        .from('tables')
        .update({ status })
        .eq('id', tableId)
        .select()
        .single()

      if (updateError) {
        console.error('Table update error:', updateError)
        return new Response(
          JSON.stringify({ error: 'Failed to update table status' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ table }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Tables API error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})