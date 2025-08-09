/*
  # Google Maps Configuration Edge Function

  This function provides Google Maps API configuration to the frontend.
  API keys are stored as secrets in Supabase Edge Functions.
  
  1. Returns Google Maps API key for frontend use
  2. Handles CORS for frontend requests
  3. Provides fallback responses when keys are not configured
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
    // Get Google Maps API key from Supabase secrets
    const googleMapsApiKey = Deno.env.get('VITE_GOOGLE_MAPS_API_KEY')
    const googlePlacesApiKey = Deno.env.get('VITE_GOOGLE_PLACES_API_KEY')

    if (!googleMapsApiKey) {
      return new Response(
        JSON.stringify({ 
          error: 'Google Maps API key not configured',
          available: false 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    return new Response(
      JSON.stringify({
        apiKey: googleMapsApiKey,
        placesApiKey: googlePlacesApiKey || googleMapsApiKey,
        available: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error getting Google Maps config:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to get Google Maps configuration',
        available: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})