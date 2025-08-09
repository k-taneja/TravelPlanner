/*
  # Get Supabase Configuration Edge Function

  This function provides Supabase client configuration from secrets.
  Returns the URL and anon key needed for frontend client initialization.
  
  1. Retrieves Supabase URL and anon key from secrets
  2. Returns configuration for frontend client initialization
  3. Handles CORS for frontend requests
*/

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Supabase configuration from secrets
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ 
          error: 'Supabase configuration not found in secrets',
          available: false 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      )
    }

    return new Response(
      JSON.stringify({
        url: supabaseUrl,
        anonKey: supabaseAnonKey,
        available: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error getting Supabase config:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to get Supabase configuration',
        available: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})