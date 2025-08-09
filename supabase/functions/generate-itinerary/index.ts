/*
  # Generate Itinerary Edge Function

  This function handles AI-powered itinerary generation using OpenRouter API.
  All API keys are configured as secrets in Supabase Edge Functions.
  
  1. Receives trip parameters from frontend
  2. Calls OpenRouter API with configured model
  3. Returns structured itinerary data
  4. Handles fallbacks and error cases
*/

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface TripRequest {
  destination: string
  startDate: string
  endDate: string
  budget: number
  pace: 'relaxed' | 'balanced' | 'fast'
  interests: string[]
  from?: string
}

interface Activity {
  time: string
  name: string
  type: string
  description: string
  duration: number
  cost: number
  location: {
    lat: number
    lng: number
    address: string
  }
  whyThis: string
}

interface DayPlan {
  day: number
  date: string
  activities: Activity[]
  totalCost: number
  totalDuration: number
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { destination, startDate, endDate, budget, pace, interests, from } = await req.json() as TripRequest

    // Get OpenRouter API key from Supabase secrets
    const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY')
    if (!openRouterApiKey) {
      throw new Error('OpenRouter API key not configured')
    }

    // Calculate number of days
    const start = new Date(startDate)
    const end = new Date(endDate)
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

    // Create detailed prompt for AI
    const prompt = `Create a detailed ${days}-day travel itinerary for ${destination} with the following requirements:

TRIP DETAILS:
- Destination: ${destination}
- Dates: ${startDate} to ${endDate} (${days} days)
- Budget: ₹${budget.toLocaleString('en-IN')} total
- Travel Pace: ${pace}
- Interests: ${interests.join(', ')}
${from ? `- Starting from: ${from}` : ''}

REQUIREMENTS:
1. Create exactly ${days} days of activities
2. Each day should have 3-4 activities with specific times
3. Include a mix of: attractions, food experiences, cultural sites, and ${interests.join(', ')} activities
4. Stay within budget (convert costs to INR, 1 USD ≈ 83 INR)
5. Consider ${pace} pace: ${pace === 'relaxed' ? 'fewer activities, more time at each' : pace === 'fast' ? 'more activities, efficient timing' : 'balanced mix of activities and rest'}
6. Provide realistic locations with coordinates for ${destination}
7. Explain why each activity fits the traveler's interests

RESPONSE FORMAT (JSON only, no markdown):
{
  "itinerary": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "activities": [
        {
          "time": "09:00",
          "name": "Activity Name",
          "type": "attraction|food|history|nature|shopping|transport",
          "description": "Brief description",
          "duration": 120,
          "cost": 25,
          "location": {
            "lat": 28.6139,
            "lng": 77.2090,
            "address": "Full address"
          },
          "whyThis": "Explanation of why this fits their interests"
        }
      ],
      "totalCost": 150,
      "totalDuration": 480
    }
  ]
}`

    // Call OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'X-Title': 'Planora Travel Planner'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          {
            role: 'system',
            content: 'You are an expert travel planner. Create detailed, realistic itineraries with accurate locations, costs in Indian Rupees, and explanations. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    })

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`)
    }

    const aiResponse = await response.json()
    const content = aiResponse.choices[0]?.message?.content

    if (!content) {
      throw new Error('No content received from AI')
    }

    // Parse AI response
    let parsedResponse
    try {
      // Clean the response to extract JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response')
      }
      parsedResponse = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error('Failed to parse AI response:', content)
      throw new Error('Invalid JSON response from AI')
    }

    // Validate and return the itinerary
    const itinerary = parsedResponse.itinerary || []
    
    return new Response(
      JSON.stringify({ itinerary }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error generating itinerary:', error)
    
    // Return fallback mock data for development
    const mockItinerary = generateMockItinerary(await req.json())
    
    return new Response(
      JSON.stringify({ 
        itinerary: mockItinerary,
        fallback: true,
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  }
})

function generateMockItinerary(request: TripRequest): DayPlan[] {
  const startDate = new Date(request.startDate)
  const endDate = new Date(request.endDate)
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
  
  const mockActivities: Activity[] = [
    {
      time: '09:00',
      name: `Explore ${request.destination}`,
      type: 'attraction',
      description: `Discover the main attractions of ${request.destination}`,
      duration: 120,
      cost: Math.floor(request.budget * 0.1),
      location: {
        lat: 28.6139 + Math.random() * 0.1,
        lng: 77.2090 + Math.random() * 0.1,
        address: `Main Area, ${request.destination}`
      },
      whyThis: `Perfect introduction to ${request.destination} based on your interests: ${request.interests.join(', ')}`
    },
    {
      time: '12:30',
      name: 'Local Cuisine Experience',
      type: 'food',
      description: `Authentic local food experience in ${request.destination}`,
      duration: 90,
      cost: Math.floor(request.budget * 0.05),
      location: {
        lat: 28.6139 + Math.random() * 0.1,
        lng: 77.2090 + Math.random() * 0.1,
        address: `Food District, ${request.destination}`
      },
      whyThis: 'Experience local flavors and culinary traditions'
    },
    {
      time: '15:00',
      name: 'Cultural Site Visit',
      type: 'history',
      description: `Historical and cultural landmarks of ${request.destination}`,
      duration: 150,
      cost: Math.floor(request.budget * 0.08),
      location: {
        lat: 28.6139 + Math.random() * 0.1,
        lng: 77.2090 + Math.random() * 0.1,
        address: `Heritage Area, ${request.destination}`
      },
      whyThis: 'Rich history and culture matching your interests'
    }
  ]

  const itinerary: DayPlan[] = []
  
  for (let i = 0; i < days; i++) {
    const currentDate = new Date(startDate)
    currentDate.setDate(startDate.getDate() + i)
    
    const dayActivities = mockActivities.map((activity) => ({
      ...activity,
      name: `${activity.name} - Day ${i + 1}`,
      cost: Math.floor(activity.cost * (0.8 + Math.random() * 0.4))
    }))
    
    const totalCost = dayActivities.reduce((sum, activity) => sum + activity.cost, 0)
    const totalDuration = dayActivities.reduce((sum, activity) => sum + activity.duration, 0)
    
    itinerary.push({
      day: i + 1,
      date: currentDate.toISOString().split('T')[0],
      activities: dayActivities,
      totalCost,
      totalDuration
    })
  }
  
  return itinerary
}