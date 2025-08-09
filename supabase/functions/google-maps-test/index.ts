/*
  # Google Maps API Test Function
  
  This function helps test Google Maps API configuration and connectivity.
  Use this to verify your API key is working correctly.
*/

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Google Maps API key from Supabase secrets
    const googleMapsApiKey = Deno.env.get('VITE_GOOGLE_MAPS_API_KEY')
    
    if (!googleMapsApiKey) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Google Maps API key not found in Supabase secrets',
          troubleshooting: {
            step: 'Add VITE_GOOGLE_MAPS_API_KEY to Supabase Edge Functions secrets',
            location: 'Supabase Dashboard > Edge Functions > Secrets'
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    // Test the API key with a simple Geocoding request
    const testAddress = 'Times Square, New York, NY'
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(testAddress)}&key=${googleMapsApiKey}`
    
    console.log('Testing Google Maps API with geocoding request...')
    
    const response = await fetch(geocodeUrl)
    const data = await response.json()
    
    if (data.status === 'OK') {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Google Maps API key is working correctly',
          testResult: {
            status: data.status,
            location: data.results[0]?.formatted_address,
            coordinates: data.results[0]?.geometry?.location
          },
          apiKeyStatus: 'Valid and functional'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    } else {
      // Handle specific API errors
      let errorMessage = 'Unknown API error'
      let troubleshooting = {}
      
      switch (data.status) {
        case 'REQUEST_DENIED':
          errorMessage = 'API key is invalid or request was denied'
          troubleshooting = {
            steps: [
              'Verify API key is correct in Supabase secrets',
              'Check API key restrictions in Google Cloud Console',
              'Ensure Geocoding API is enabled'
            ]
          }
          break
        case 'OVER_QUERY_LIMIT':
          errorMessage = 'API quota exceeded'
          troubleshooting = {
            steps: [
              'Check quota usage in Google Cloud Console',
              'Increase quota limits if needed',
              'Implement request caching to reduce API calls'
            ]
          }
          break
        case 'ZERO_RESULTS':
          errorMessage = 'Test geocoding returned no results (API key may be working)'
          break
        default:
          errorMessage = `API returned status: ${data.status}`
      }
      
      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
          apiResponse: data,
          troubleshooting
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

  } catch (error) {
    console.error('Google Maps API test failed:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to test Google Maps API',
        details: error.message,
        troubleshooting: {
          steps: [
            'Check internet connectivity',
            'Verify Supabase Edge Functions are working',
            'Check if Google Maps API endpoints are accessible'
          ]
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})