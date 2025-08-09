/*
  # Regenerate Day Edge Function

  This function handles regeneration of a specific day's itinerary based on user modifications.
  It optimizes timings, validates sequences, and maintains user preferences.
  
  1. Receives current activities and user changes
  2. Calls OpenRouter API for intelligent optimization
  3. Returns optimized day plan with better timings
  4. Handles validation and error cases
*/

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface RegenerateRequest {
  destination: string
  date: string
  dayNumber: number
  currentActivities: any[]
  budget: number
  pace: string
  interests: string[]
  userChanges: {
    modified: boolean
    instruction: string
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const request = await req.json() as RegenerateRequest

    // Get OpenRouter API key from Supabase secrets
    const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY')
    
    if (!openRouterApiKey) {
      console.warn('OpenRouter API key not configured, using fallback optimization')
      return new Response(
        JSON.stringify({ 
          dayPlan: generateOptimizedFallback(request),
          fallback: true 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create optimization prompt
    const prompt = `You are an expert travel planner optimizing a day's itinerary based on user modifications.

CURRENT SITUATION:
- Destination: ${request.destination}
- Date: ${request.date} (Day ${request.dayNumber})
- User has modified the itinerary and needs optimization
- Travel Pace: ${request.pace}
- Interests: ${request.interests.join(', ')}
- Budget: ₹${request.budget.toLocaleString('en-IN')}

USER'S CURRENT ACTIVITIES:
${request.currentActivities.map((activity, index) => `
${index + 1}. ${activity.name}
   - Time: ${activity.time}
   - Duration: ${activity.duration} minutes
   - Cost: ₹${activity.cost}
   - Type: ${activity.type}
   - Location: ${activity.location_address}
   - Description: ${activity.description}
`).join('')}

OPTIMIZATION REQUIREMENTS:
1. ${request.userChanges.instruction}
2. Optimize timing sequence to ensure realistic travel time between locations
3. Maintain user's activity selections but improve the flow
4. Add 15-30 minute buffers between activities for travel
5. Ensure activities don't overlap in timing
6. Validate that the sequence makes geographical sense
7. Adjust costs if needed based on current market rates
8. Enhance descriptions and "why this" explanations
9. Consider meal times and natural break points
10. Ensure the pace matches user preference (${request.pace})

RESPONSE FORMAT (JSON only):
{
  "dayPlan": {
    "day": ${request.dayNumber},
    "date": "${request.date}",
    "activities": [
      {
        "time": "09:00",
        "name": "Activity Name",
        "type": "attraction|food|history|nature|shopping|transport",
        "description": "Enhanced description",
        "duration": 120,
        "cost": 25,
        "location": {
          "lat": 28.6139,
          "lng": 77.2090,
          "address": "Optimized address"
        },
        "whyThis": "Enhanced explanation of why this timing and sequence works"
      }
    ],
    "totalCost": 150,
    "totalDuration": 480,
    "optimizationNotes": "Brief explanation of changes made"
  }
}`

    // Call OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'X-Title': 'Planora Day Optimizer'
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          {
            role: 'system',
            content: 'You are an expert travel optimizer. Analyze user modifications and create optimized itineraries with realistic timings and improved flow. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent optimization
        max_tokens: 2000
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
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response')
      }
      parsedResponse = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error('Failed to parse AI response:', content)
      throw new Error('Invalid JSON response from AI')
    }

    const dayPlan = parsedResponse.dayPlan
    
    // Normalize activity types
    const validActivityTypes = ['attraction', 'food', 'transport', 'shopping', 'nature', 'history']
    
    // Enhanced type mapping for all activity types
    const typeMapping: { [key: string]: string } = {
      'sightseeing': 'attraction',
      'museum': 'attraction',
      'flight': 'transport',
      'accommodation': 'attraction',
      'entertainment': 'attraction',
      'wellness': 'attraction',
      'sports': 'nature',
      'business': 'attraction',
      'social': 'attraction',
      'personal': 'attraction',
      'rest': 'attraction',
      'transit': 'transport',
      'other': 'attraction',
      'restaurant': 'food',
      'dining': 'food',
      'market': 'shopping',
      'park': 'nature',
      'historical': 'history'
    }
    
    if (dayPlan?.activities) {
      dayPlan.activities = dayPlan.activities.map((activity: any) => {
        let normalizedType = activity.type?.toLowerCase().trim() || 'attraction'
        if (typeMapping[normalizedType]) {
          normalizedType = typeMapping[normalizedType]
        }
        if (!validActivityTypes.includes(normalizedType)) {
          normalizedType = 'attraction'
        }
        
        return {
          ...activity,
          type: normalizedType
        }
      })
    }
    
    return new Response(
      JSON.stringify({ dayPlan }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error optimizing day:', error)
    
    // Return fallback optimization
    const fallbackPlan = generateOptimizedFallback(await req.json())
    
    return new Response(
      JSON.stringify({ 
        dayPlan: fallbackPlan,
        fallback: true,
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

function generateOptimizedFallback(request: RegenerateRequest) {
  // Smart timing optimization
  const optimizedActivities = request.currentActivities.map((activity, index) => {
    let newTime = activity.time
    
    // Auto-adjust timings based on previous activity
    if (index > 0) {
      const prevActivity = request.currentActivities[index - 1]
      const prevEndTime = new Date(`2000-01-01T${prevActivity.time}`)
      prevEndTime.setMinutes(prevEndTime.getMinutes() + (prevActivity.duration || 60) + 30) // Add 30min buffer
      
      const hours = prevEndTime.getHours().toString().padStart(2, '0')
      const minutes = prevEndTime.getMinutes().toString().padStart(2, '0')
      newTime = `${hours}:${minutes}`
    }
    
    return {
      ...activity,
      time: newTime,
      location: activity.location || {
        lat: 28.6139 + Math.random() * 0.1,
        lng: 77.2090 + Math.random() * 0.1,
        address: activity.location_address || `${activity.name} Location`
      },
      whyThis: activity.why_this || `Optimized timing for better flow and travel efficiency in ${request.destination}`
    }
  })

  const totalCost = optimizedActivities.reduce((sum, activity) => sum + (activity.cost || 0), 0)
  const totalDuration = optimizedActivities.reduce((sum, activity) => sum + (activity.duration || 0), 0)

  return {
    day: request.dayNumber,
    date: request.date,
    activities: optimizedActivities,
    totalCost,
    totalDuration,
    optimizationNotes: "Timings optimized with travel buffers and logical sequence"
  }
}