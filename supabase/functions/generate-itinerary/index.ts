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
  userPreferences?: any
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
    const { 
      destination, 
      startDate, 
      endDate, 
      budget, 
      pace, 
      interests, 
      from,
      userPreferences,
      tripType = 'single',
      destinations,
      isMultiDestination = false
    } = await req.json() as TripRequest

    // Get OpenRouter API key from Supabase secrets
    const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY')
    if (!openRouterApiKey) {
      throw new Error('OpenRouter API key not configured')
    }

    // Calculate number of days
    const start = new Date(startDate)
    const end = new Date(endDate)
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

    console.log(`CRITICAL: Planning ${days}-day trip from ${startDate} to ${endDate}`)
    console.log(`CRITICAL: Start date: ${start.toISOString()}, End date: ${end.toISOString()}`)
    console.log(`Trip type: ${tripType}, Multi-destination: ${isMultiDestination}`)
    if (destinations) {
      console.log(`Destinations to optimize:`, destinations.map(d => d.name))
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
      // AI-powered route optimization for multi-destination trips
      const routeOptimizationPrompt = `
CRITICAL: ROUTE OPTIMIZATION REQUIRED
You must analyze and optimize the route for maximum efficiency and cost savings.

ROUTE OPTIMIZATION ALGORITHM:
1. GEOGRAPHICAL ANALYSIS: Consider the geographical proximity and logical flow between destinations
2. COST OPTIMIZATION: Minimize total transportation costs by reducing backtracking
3. TIME EFFICIENCY: Optimize travel sequence to minimize total travel time
4. INTEREST ALIGNMENT: Allocate more time to destinations that match user interests: ${interests.join(', ')}
5. SEASONAL FACTORS: Consider weather patterns, festivals, and peak seasons
6. TRANSPORTATION EFFICIENCY: Choose optimal transport methods and routes

ORIGINAL USER INPUT ORDER: ${destinations.map(d => d.name).join(' → ')}
STARTING POINT: ${from || 'Not specified'}

YOU MUST REORDER AND OPTIMIZE THE DESTINATIONS FOR:
- Minimum total travel cost and time
- Maximum interest satisfaction
- Logical geographical flow
- Efficient transportation connections

PROVIDE CLEAR EXPLANATIONS for why you chose this optimized route over the user's original sequence.
`

      const destinationList = destinations.map(d => `${d.name} (${tripType === 'multi_fixed' ? d.days + ' days' : 'flexible duration'})`).join(', ')
      
      prompt = `You are an expert travel planner and route optimization specialist creating a personalized ${days}-day multi-destination itinerary.

${routeOptimizationPrompt}

MULTI-DESTINATION TRIP REQUIREMENTS:
- Trip Type: ${tripType.toUpperCase()}
- Original Destinations: ${destinationList}
- Total Duration: ${days} days (${startDate} to ${endDate})
- Starting Point: ${from || 'Not specified'}
- Total Budget: ₹${budget.toLocaleString('en-IN')} (approximately $${Math.round(budget/83)})
- Travel Pace: ${pace.toUpperCase()} - ${currentPace.description}
- Primary Interests: ${interests.join(', ')}

${tripType === 'multi_fixed' ? 
    `FIXED ALLOCATION WITH OPTIMIZATION:
- Maintain specified days per destination: ${destinations.map(d => `${d.name} (${d.days} days)`).join(', ')}
- But REORDER destinations for optimal route efficiency
- Add travel days between destinations (not counted in fixed days)
- Total trip must be exactly ${days} days including travel days` :
  `FLEXIBLE ALLOCATION WITH FULL OPTIMIZATION:
- REORDER destinations for maximum efficiency
- REALLOCATE days based on interest alignment and destination density
- Suggest 2-5 days per destination based on available activities
- Ensure minimum 2 days per destination for meaningful experience
- Include travel days between destinations
- Total trip must be exactly ${days} days`
}

CRITICAL REQUIREMENTS FOR ${days}-DAY TRIP:
1. YOU MUST GENERATE EXACTLY ${days} DAYS - THIS IS MANDATORY
2. NEVER GENERATE FEWER THAN ${days} DAYS - SYSTEM WILL REJECT INCOMPLETE ITINERARIES
3. OPTIMIZE ROUTE SEQUENCE - Reorder destinations for maximum efficiency
4. INCLUDE ALL DESTINATIONS - But in the most logical geographical order
5. ADD TRAVEL DAYS - Between destinations (these count toward the ${days} total)
6. BALANCE TIME ALLOCATION - Based on interests and destination density

ROUTE OPTIMIZATION MANDATORY REQUIREMENTS:
- ANALYZE: Mumbai → Goa → Chennai → Bangalore (user input)
- OPTIMIZE TO: Mumbai → Goa → Bangalore → Chennai (logical flow)
- REASONING: Reduces backtracking, saves travel time and costs
- ALWAYS EXPLAIN: Why you chose this route over user's original sequence

ROUTE OPTIMIZATION EXAMPLES:
- If user inputs: Mumbai → Goa → Chennai → Bangalore
- Optimal route might be: Mumbai → Goa → Bangalore → Chennai (reduces backtracking)
- Or: Mumbai → Chennai → Bangalore → Goa (based on interests and seasons)

TRAVEL DAY REQUIREMENTS:
- Include realistic travel days between destinations
- Provide specific transport recommendations (flight, train, bus)
- Include travel costs and duration
- Account for check-in/check-out logistics
- Add buffer time for delays and rest

DESTINATION-SPECIFIC REQUIREMENTS:
For each destination in your OPTIMIZED route order:
- Focus on attractions matching interests: ${interests.join(', ')}
- Include local cuisine and cultural experiences  
- Plan ${currentPace.activities} activities per day
- Provide clear reasoning for time allocation
- Suggest best activities based on user interests

EXPLANATION REQUIREMENT:
You MUST include in your response an explanation of:
1. Why you chose this route order over the user's original sequence
2. How this optimization saves time and money
3. How the route maximizes the user's interests: ${interests.join(', ')}
4. What transportation methods you recommend between destinations`
    } else {
      // Single destination prompt (existing logic)
      prompt = `You are an expert travel planner creating a personalized ${days}-day itinerary for ${destination}.`
    }

    // Continue with common prompt sections
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

CRITICAL: RESPONSE FORMAT (JSON only, no markdown):
You must generate exactly ${days} days. This is mandatory - do not generate fewer days.

{
  ${isMultiDestination ? '"routeOptimization": {"originalOrder": ["' + destinations?.map(d => d.name).join('", "') + '"], "optimizedOrder": ["Optimized", "Route", "Order"], "reasoning": "Detailed explanation of why this route is better"},' : ''}
  "itinerary": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      ${isMultiDestination ? '"destinationName": "Destination Name",' : ''}
      ${isMultiDestination ? '"isTravel": false,' : ''}
      ${isMultiDestination ? '"travelDetails": "Travel information if applicable",' : ''}
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
            content: `You are an expert travel planner and route optimization specialist. 

CRITICAL REQUIREMENTS:
- You MUST generate exactly ${days} days of itinerary
- NEVER generate fewer than ${days} days - this will cause system failure
- For multi-destination trips, you MUST reorder destinations for optimal efficiency
- Do NOT follow user input order - optimize for cost and time savings
- Always provide route optimization reasoning
- Respond with valid JSON only - no markdown or explanations outside JSON`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: Math.max(4000, days * 800) // Scale tokens based on trip length
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

    console.log('AI Response length:', content.length)
    console.log('AI Response preview:', content.substring(0, 500))

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
    const routeOptimization = parsedResponse.routeOptimization || null
    
    console.log(`Generated ${itinerary.length} days for ${days}-day trip`)
    if (routeOptimization) {
      console.log('Route optimization:', routeOptimization)
    }
    
    // Validate that we have the correct number of days
    if (itinerary.length !== days) {
      console.error(`CRITICAL ERROR: Expected ${days} days, got ${itinerary.length} days. Force-adjusting...`)
      
      // If we have fewer days than expected, extend with mock data
      while (itinerary.length < days) {
        const lastDay = itinerary[itinerary.length - 1] || {
          activities: [{
            time: '09:00',
            name: 'Explore Local Area',
            type: 'attraction',
            description: 'Additional exploration day',
            duration: 120,
            cost: 50,
            location: { lat: 28.6139, lng: 77.2090, address: 'Local Area' },
            whyThis: 'Extended exploration based on your interests'
          }],
          totalCost: 50,
          totalDuration: 120
        }
        const nextDayNumber = itinerary.length + 1
        const nextDate = new Date(startDate)
        nextDate.setDate(nextDate.getDate() + nextDayNumber - 1)
        
        console.log(`Force-adding day ${nextDayNumber} for ${nextDate.toISOString().split('T')[0]}`)
        
        itinerary.push({
          day: nextDayNumber,
          date: nextDate.toISOString().split('T')[0],
          activities: lastDay.activities.map(activity => ({
            ...activity,
            name: `${activity.name} - Day ${nextDayNumber}`
          })),
          totalCost: lastDay.totalCost,
          totalDuration: lastDay.totalDuration,
          destinationName: lastDay.destinationName || destinations?.[destinations.length - 1]?.name || 'Extended Stay',
          isTravel: false
        })
      }
      
      // If we have more days than expected, trim
      if (itinerary.length > days) {
        itinerary.splice(days)
      }
    }
    
    // Map destination names back to client-side IDs for multi-destination trips
    if (isMultiDestination && destinations) {
      const destinationNameToIdMap = new Map(
        destinations.map(dest => [dest.name.toLowerCase(), dest.id])
      )
      
      itinerary.forEach((day: DayPlan) => {
        if (day.destinationName && !day.destinationId) {
          const matchingId = destinationNameToIdMap.get(day.destinationName.toLowerCase())
          if (matchingId) {
            day.destinationId = matchingId
          }
        }
      })
    }
    
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
      JSON.stringify({ 
        itinerary: normalizedItinerary,
        routeOptimization,
        totalDays: normalizedItinerary.length,
        generatedDays: days
      }),
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
  
  console.log(`MOCK: Generating ${days}-day mock itinerary for ${request.startDate} to ${request.endDate}`)
  
  // Handle multi-destination trips
  if (request.isMultiDestination && request.destinations) {
    return generateMultiDestinationMockItinerary(request, days)
  }
  
  // Single destination logic (existing)
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
  
  console.log(`Generated ${itinerary.length} days of mock itinerary`)
  return itinerary
}

// Multi-destination mock itinerary generator
function generateMultiDestinationMockItinerary(request: TripRequest, totalDays: number): DayPlan[] {
  const startDate = new Date(request.startDate)
  const destinations = request.destinations!
  const itinerary: DayPlan[] = []
  
  console.log(`MOCK MULTI: Generating ${totalDays} days with destinations:`, destinations.map(d => d.name))
  
  // AI-powered route optimization for mock data
  let optimizedDestinations = [...destinations]
  
  // Simple geographical optimization (in real implementation, this would use actual coordinates)
  if (request.tripType === 'multi_flexible') {
    // Simulate route optimization based on common geographical knowledge
    optimizedDestinations = optimizeDestinationOrder(destinations, request.interests)
    console.log('MOCK OPTIMIZATION: From:', destinations.map(d => d.name), 'To:', optimizedDestinations.map(d => d.name))
  }
  
  let currentDay = 1
  let currentDate = new Date(startDate)
  
  // Calculate optimal day allocation for the FULL trip duration
  const travelDays = Math.max(0, optimizedDestinations.length - 1) // Travel days between destinations
  const availableDays = Math.max(totalDays - travelDays, optimizedDestinations.length * 2) // Ensure minimum 2 days per destination
  
  if (request.tripType === 'multi_flexible') {
    const baseDaysPerDestination = Math.floor(availableDays / optimizedDestinations.length)
    const extraDays = availableDays % optimizedDestinations.length
    
    console.log(`MOCK ALLOCATION: ${availableDays} available days, ${baseDaysPerDestination} base days per destination`)
    
    optimizedDestinations = optimizedDestinations.map((dest, index) => ({
      ...dest,
      days: Math.max(2, baseDaysPerDestination + (index < extraDays ? 1 : 0)) // Minimum 2 days per destination
    }))
  }
  
  // Process optimized destinations in order
  for (let destIndex = 0; destIndex < optimizedDestinations.length; destIndex++) {
    const destination = optimizedDestinations[destIndex]
    const isLastDestination = destIndex === optimizedDestinations.length - 1
    
    // Calculate days for this destination
    let daysForDestination = destination.days
    
    console.log(`MOCK: Planning ${daysForDestination} days for ${destination.name} (Day ${currentDay} onwards)`)
    for (let dayInDest = 0; dayInDest < daysForDestination; dayInDest++) {
      // Ensure we don't exceed total trip days
      if (currentDay > totalDays) break
      
      const mockActivities: Activity[] = [
        {
          time: '09:00',
          name: `Explore ${destination.name}`,
          type: 'attraction',
          description: `Discover the main attractions of ${destination.name}`,
          duration: 120,
          cost: Math.floor(request.budget * 0.08),
          location: {
            lat: 28.6139 + Math.random() * 0.1,
            lng: 77.2090 + Math.random() * 0.1,
            address: `Main Area, ${destination.name}`
          },
          whyThis: `Perfect introduction to ${destination.name} based on your interests`
        },
        {
          time: '12:30',
          name: `Local Cuisine in ${destination.name}`,
          type: 'food',
          description: `Authentic local food experience in ${destination.name}`,
          duration: 90,
          cost: Math.floor(request.budget * 0.04),
          location: {
            lat: 28.6139 + Math.random() * 0.1,
            lng: 77.2090 + Math.random() * 0.1,
            address: `Food District, ${destination.name}`
          },
          whyThis: 'Experience local flavors and culinary traditions'
        },
        {
          time: '15:00',
          name: `Cultural Sites in ${destination.name}`,
          type: 'history',
          description: `Historical and cultural landmarks of ${destination.name}`,
          duration: 150,
          cost: Math.floor(request.budget * 0.06),
          location: {
            lat: 28.6139 + Math.random() * 0.1,
            lng: 77.2090 + Math.random() * 0.1,
            address: `Heritage Area, ${destination.name}`
          },
          whyThis: 'Rich history and culture matching your interests'
        }
      ]
      
      const totalCost = mockActivities.reduce((sum, activity) => sum + activity.cost, 0)
      const totalDuration = mockActivities.reduce((sum, activity) => sum + activity.duration, 0)
      
      itinerary.push({
        day: currentDay,
        date: currentDate.toISOString().split('T')[0],
        activities: mockActivities,
        totalCost,
        totalDuration,
        destinationId: destination.id,
        destinationName: destination.name
      })
      
      currentDay++
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    // Add travel day between destinations (except for the last one)
    if (!isLastDestination && currentDay <= totalDays) {
      const nextDestination = optimizedDestinations[destIndex + 1]
      
      itinerary.push({
        day: currentDay,
        date: currentDate.toISOString().split('T')[0],
        activities: [
          {
            time: '10:00',
            name: `Travel to ${nextDestination.name}`,
            type: 'transport',
            description: `Journey from ${destination.name} to ${nextDestination.name}`,
            duration: 240, // 4 hours travel time
            cost: Math.floor(request.budget * 0.1),
            location: {
              lat: 28.6139,
              lng: 77.2090,
              address: `En route to ${nextDestination.name}`
            },
            whyThis: 'Efficient travel between destinations with time for rest'
          }
        ],
        totalCost: Math.floor(request.budget * 0.1),
        totalDuration: 240,
        isTravel: true,
        travelDetails: `Travel day from ${destination.name} to ${nextDestination.name}`,
        destinationId: nextDestination.id,
        destinationName: nextDestination.name
      })
      
      currentDay++
      currentDate.setDate(currentDate.getDate() + 1)
    }
  }
  
  // Ensure we have exactly the right number of days
  while (itinerary.length < totalDays && optimizedDestinations.length > 0) {
    const lastDestination = optimizedDestinations[Math.floor(Math.random() * optimizedDestinations.length)]
    const nextDate = new Date(startDate)
    nextDate.setDate(nextDate.getDate() + itinerary.length)
    
    itinerary.push({
      day: itinerary.length + 1,
      date: nextDate.toISOString().split('T')[0],
      activities: [
        {
          time: '09:00',
          name: `Extended Stay in ${lastDestination.name}`,
          type: 'attraction',
          description: `Additional exploration day in ${lastDestination.name}`,
          duration: 120,
          cost: Math.floor(request.budget * 0.05),
          location: {
            lat: 28.6139 + Math.random() * 0.1,
            lng: 77.2090 + Math.random() * 0.1,
            address: `${lastDestination.name} Extended Area`
          },
          whyThis: 'Additional time to explore based on your interests'
        }
      ],
      totalCost: Math.floor(request.budget * 0.05),
      totalDuration: 120,
      destinationId: lastDestination.id,
      destinationName: lastDestination.name
    })
  }
  
  console.log(`MOCK MULTI FINAL: Generated ${itinerary.length} days (expected ${totalDays})`)
  return itinerary
}

// Simple route optimization function for mock data
function optimizeDestinationOrder(destinations: Array<{ id: string; name: string; days: number }>, interests: string[]): Array<{ id: string; name: string; days: number }> {
  // This is a simplified optimization. In a real implementation, you would use:
  // - Actual geographical coordinates
  // - Real distance/cost calculations
  // - Advanced routing algorithms
  
  const optimized = [...destinations]
  
  // Simple geographical optimization based on common knowledge
  const geographicalGroups: { [key: string]: string[] } = {
    'north': ['delhi', 'agra', 'jaipur', 'chandigarh', 'shimla', 'manali'],
    'west': ['mumbai', 'pune', 'goa', 'ahmedabad', 'udaipur', 'jodhpur'],
    'south': ['bangalore', 'chennai', 'hyderabad', 'kochi', 'mysore', 'coorg'],
    'east': ['kolkata', 'bhubaneswar', 'darjeeling', 'gangtok']
  }
  
  // Group destinations by region
  const regionGroups: { [key: string]: typeof destinations } = {}
  
  optimized.forEach(dest => {
    const destName = dest.name.toLowerCase()
    let region = 'other'
    
    for (const [regionName, cities] of Object.entries(geographicalGroups)) {
      if (cities.some(city => destName.includes(city))) {
        region = regionName
        break
      }
    }
    
    if (!regionGroups[region]) {
      regionGroups[region] = []
    }
    regionGroups[region].push(dest)
  })
  
  // Reorder to minimize inter-region travel
  const reordered: typeof destinations = []
  
  // Add destinations region by region to minimize backtracking
  Object.values(regionGroups).forEach(regionDests => {
    reordered.push(...regionDests)
  })
  
  return reordered.length > 0 ? reordered : optimized
}