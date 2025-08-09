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
  tripType?: 'single' | 'multi_fixed' | 'multi_flexible'
  destinations?: Array<{ id: string; name: string; days: number }>
  isMultiDestination?: boolean
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
  destinationId?: string
  destinationName?: string
  isTravel?: boolean
  travelDetails?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { destination, startDate, endDate, budget, pace, interests, from, tripType, destinations, isMultiDestination } = await req.json() as TripRequest

    // Get OpenRouter API key from Supabase secrets
    const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY')
    if (!openRouterApiKey) {
      throw new Error('OpenRouter API key not configured')
    }

    // Calculate number of days
    const start = new Date(startDate)
    const end = new Date(endDate)
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

    // Get user preferences from database (if available)
    let userPreferences = null
    try {
      // Get Supabase client for database queries
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      
      const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })

      const { data: preferences } = await supabaseClient
        .from('user_preferences')
        .select('*')
        .eq('user_id', from || 'anonymous') // Use from field or anonymous
        .single()
      userPreferences = preferences
    } catch (error) {
      console.log('No user preferences found, using defaults')
    }

    // Define activity counts based on pace
    const paceConfig = {
      relaxed: { activities: '1-2', restaurants: 1, description: 'leisurely exploration with plenty of rest time' },
      balanced: { activities: '3-4', restaurants: 1, description: 'good mix of activities and relaxation' },
      fast: { activities: '5-6', restaurants: 2, description: 'action-packed itinerary with maximum experiences' }
    }

    const currentPace = paceConfig[pace] || paceConfig.balanced

    // Create comprehensive prompt for AI based on trip type
    let prompt = ''
    
    if (isMultiDestination && destinations) {
      // Multi-destination prompt
      const destinationList = destinations.map(d => `${d.name} (${tripType === 'multi_fixed' ? d.days + ' days' : 'flexible duration'})`).join(', ')
      
      prompt = `You are an expert travel planner creating a personalized ${days}-day multi-destination itinerary.

MULTI-DESTINATION TRIP REQUIREMENTS:
- Destinations: ${destinationList}
- Trip Type: ${tripType?.toUpperCase()}
- Total Duration: ${days} days (${startDate} to ${endDate})
- Total Budget: ₹${budget.toLocaleString('en-IN')} (approximately $${Math.round(budget/83)})
- Travel Pace: ${pace.toUpperCase()} - ${currentPace.description}
- Primary Interests: ${interests.join(', ')}
${from ? `- Starting Location: ${from}` : ''}

DESTINATION-SPECIFIC PLANNING:
${tripType === 'multi_fixed' ? 
  destinations.map(d => `- ${d.name}: Exactly ${d.days} days planned`).join('\n') :
  `- AI should optimize time allocation based on available activities, interests, and logistics
- Consider travel time between destinations
- Suggest optimal duration for each destination based on attractions and user interests`
}

TRAVEL LOGISTICS:
- Include travel days between destinations with realistic transport options
- Consider travel time, cost, and comfort
- Suggest best transport methods (flight, train, bus, car) based on distance and budget
- Account for check-in/check-out times and travel fatigue

BUDGET ALLOCATION:
- Distribute budget across all destinations proportionally
- Include transportation costs between cities
- Account for accommodation transitions
- Consider varying cost of living in different destinations`
    } else {
      // Single destination prompt (existing)
      prompt = `You are an expert travel planner creating a personalized ${days}-day itinerary for ${destination}.`
    }
    
    // Common prompt sections
    prompt += `

TRIP REQUIREMENTS:
- Destination: ${destination}
- Travel Dates: ${startDate} to ${endDate} (${days} days)
- Total Budget: ₹${budget.toLocaleString('en-IN')} (approximately $${Math.round(budget/83)})
- Travel Pace: ${pace.toUpperCase()} - ${currentPace.description}
- Primary Interests: ${interests.join(', ')}
${from ? `- Starting Location: ${from}` : ''}

PACE-SPECIFIC REQUIREMENTS:
- ${pace.toUpperCase()} pace means ${currentPace.activities} main activities per day
- Include ${currentPace.restaurants} restaurant/dining experience${currentPace.restaurants > 1 ? 's' : ''} per day
- Balance activity intensity with appropriate rest periods

USER PREFERENCES:
${userPreferences ? `
- Day Planning Hours: ${userPreferences.start_time} to ${userPreferences.end_time}
- Dietary Restrictions: ${userPreferences.dietary_restrictions || 'None specified'}
- Food Preferences: ${userPreferences.food_preferences || 'Open to all cuisines'}
- Travel Style: ${userPreferences.travel_style || 'Standard'}
- Budget Preference: ${userPreferences.budget_preference || 'Balanced spending'}
- Personal Travel Preferences: ${userPreferences.travel_preferences || 'Standard travel approach'}
` : '- Using default preferences (no user profile found)'}

BUDGET ALLOCATION GUIDELINES:
- Distribute budget across ${days} days (₹${Math.round(budget/days).toLocaleString('en-IN')} per day average)
- Allocate 40% for activities/attractions, 35% for food, 15% for transport, 10% for miscellaneous
- Suggest both budget-friendly and premium options when relevant
- Consider local pricing and seasonal variations

DETAILED REQUIREMENTS:
1. Create exactly ${days} days with ${currentPace.activities} main activities per day
2. Include ${currentPace.restaurants} dining experience(s) per day with local cuisine focus
3. ${userPreferences ? `Plan activities between ${userPreferences.start_time} and ${userPreferences.end_time} as per user preference` : 'Start days between 8:00-10:00 AM, end by 8:00-10:00 PM based on pace'}
4. Provide realistic timing with travel time between locations
5. Include specific addresses and coordinates for ${destination}
6. Consider weather, local customs, and opening hours
7. Explain why each recommendation matches user interests and preferences
8. Include insider tips and local recommendations
9. Suggest alternatives for different weather conditions
10. Provide cost breakdowns in Indian Rupees (₹)

ACTIVITY TYPES TO INCLUDE:
- Must-see attractions related to: ${interests.join(', ')}
${userPreferences?.food_preferences && userPreferences.food_preferences !== 'all' ? `- Food experiences focusing on: ${userPreferences.food_preferences}` : '- Diverse culinary experiences'}
${userPreferences?.dietary_restrictions ? `- All food suggestions must accommodate: ${userPreferences.dietary_restrictions}` : ''}
- Cultural experiences and local traditions
${userPreferences?.travel_preferences ? `- Experiences matching user's travel style: ${userPreferences.travel_preferences}` : ''}
- Hidden gems and off-the-beaten-path locations
- Photo-worthy spots and Instagram-able locations
${interests.includes('shopping') ? '- Local markets and authentic shopping experiences' : ''}
${interests.includes('nature') ? '- Nature and outdoor activities' : ''}
${interests.includes('history') ? '- Historical sites and museums' : ''}

TRANSPORTATION AND BUDGET CONSIDERATIONS:
${userPreferences?.budget_preference === 'budget' ? '- Prioritize budget-friendly transport options (public transport, walking)' : ''}
${userPreferences?.budget_preference === 'luxury' ? '- Include premium transport options (private cars, first-class)' : ''}
${userPreferences?.budget_preference === 'balanced' ? '- Mix of transport options balancing cost and convenience' : ''}
${userPreferences?.travel_style === 'backpacker' ? '- Focus on budget accommodations and local transport' : ''}
${userPreferences?.travel_style === 'luxury' ? '- Premium experiences and comfortable transport' : ''}

TIMING AND LOGISTICS:
- Account for travel time between locations (15-30 minutes buffer)
- Consider meal times: breakfast (8-10 AM), lunch (12-2 PM), dinner (7-9 PM)
- Include rest periods for ${pace} pace travelers
- Suggest optimal visiting times to avoid crowds
- Consider local transportation options and costs
RESPONSE FORMAT (JSON only, no markdown):
{
  "itinerary": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      ${isMultiDestination ? '"destinationName": "City Name",' : ''}
      ${isMultiDestination ? '"destinationId": "destination-id",' : ''}
      ${isMultiDestination ? '"isTravel": false,' : ''}
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
    
    // Normalize and validate activity types to match database constraints
    const validActivityTypes = ['attraction', 'food', 'transport', 'shopping', 'nature', 'history']
    
    const normalizedItinerary = itinerary.map((day: DayPlan) => ({
      ...day,
      activities: day.activities.map((activity: Activity) => {
        let normalizedType = activity.type.toLowerCase().trim()
        
        // Map common variations to valid types
        const typeMapping: { [key: string]: string } = {
          'sightseeing': 'attraction',
          'museum': 'attraction',
          'monument': 'attraction',
          'temple': 'attraction',
          'palace': 'attraction',
          'fort': 'attraction',
          'restaurant': 'food',
          'dining': 'food',
          'meal': 'food',
          'cuisine': 'food',
          'lunch': 'food',
          'dinner': 'food',
          'breakfast': 'food',
          'taxi': 'transport',
          'bus': 'transport',
          'train': 'transport',
          'flight': 'transport',
          'travel': 'transport',
          'market': 'shopping',
          'bazaar': 'shopping',
          'mall': 'shopping',
          'souvenir': 'shopping',
          'park': 'nature',
          'garden': 'nature',
          'beach': 'nature',
          'lake': 'nature',
          'mountain': 'nature',
          'wildlife': 'nature',
          'historical': 'history',
          'heritage': 'history',
          'cultural': 'history',
          'archaeology': 'history'
        }
        
        // Check if the type needs mapping
        if (typeMapping[normalizedType]) {
          normalizedType = typeMapping[normalizedType]
        }
        
        // If still not valid, default to 'attraction'
        if (!validActivityTypes.includes(normalizedType)) {
          normalizedType = 'attraction'
        }
        
        return {
          ...activity,
          type: normalizedType
        }
      })
    }))
    
    return new Response(
      JSON.stringify({ itinerary: normalizedItinerary }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error generating itinerary:', error)
    
    // Return fallback mock data for development
    const requestData = await req.json()
    const mockItinerary = generateMockItinerary(requestData)
    
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
  
  // Handle multi-destination trips
  if (request.isMultiDestination && request.destinations) {
    return generateMultiDestinationMockItinerary(request, days)
  }
  
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

// Multi-destination mock itinerary generator
function generateMultiDestinationMockItinerary(request: TripRequest, totalDays: number): DayPlan[] {
  const startDate = new Date(request.startDate)
  const destinations = request.destinations!
  const itinerary: DayPlan[] = []
  
  let currentDay = 1
  let currentDate = new Date(startDate)
  
  for (let destIndex = 0; destIndex < destinations.length; destIndex++) {
    const destination = destinations[destIndex]
    const isLastDestination = destIndex === destinations.length - 1
    
    // Calculate days for this destination