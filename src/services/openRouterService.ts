// Backend-integrated OpenRouter service
// All API keys are configured in Supabase Edge Functions
import { supabase } from '../lib/supabase';

export interface TripPlanRequest {
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  pace: 'relaxed' | 'balanced' | 'fast';
  interests: string[];
  from?: string;
  userPreferences?: any;
  tripType?: 'single' | 'multi_fixed' | 'multi_flexible';
  destinations?: Array<{ id: string; name: string; days: number }>;
  isMultiDestination?: boolean;
}

export interface GeneratedActivity {
  time: string;
  name: string;
  type: string;
  description: string;
  duration: number;
  cost: number;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  whyThis: string;
}

export interface GeneratedDayPlan {
  day: number;
  date: string;
  activities: GeneratedActivity[];
  totalCost: number;
  totalDuration: number;
  destinationId?: string;
  destinationName?: string;
  isTravel?: boolean;
  travelDetails?: string;
}

export const openRouterService = {
  async generateItinerary(request: TripPlanRequest): Promise<GeneratedDayPlan[]> {
    try {
      console.log('Generating itinerary for:', request);
      console.log('Trip duration:', Math.ceil((new Date(request.endDate).getTime() - new Date(request.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1, 'days');
      
      // Make request to Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('generate-itinerary', {
        body: request
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to generate itinerary');
      }

      if (data?.fallback) {
        console.warn('Using fallback data:', data.error);
      }

      console.log('Generated itinerary:', data?.itinerary?.length, 'days');
      if (data?.routeOptimization) {
        console.log('Route optimization applied:', data.routeOptimization);
      }

      return data?.itinerary || [];
    } catch (error) {
      console.error('Error calling edge function:', error);
      
      // Final fallback to mock data
      console.warn('Using mock data as final fallback');
      return generateMockItinerary(request);
    }
  }
};

// Mock itinerary generator for development/fallback
function generateMockItinerary(request: TripPlanRequest): GeneratedDayPlan[] {
  const startDate = new Date(request.startDate);
  const endDate = new Date(request.endDate);
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  console.log(`Generating ${days}-day mock itinerary`);
  
  // Handle multi-destination trips
  if (request.isMultiDestination && request.destinations) {
    return generateMultiDestinationMockItinerary(request, days);
  }
  
  // Single destination logic (existing)
  const mockActivities: GeneratedActivity[] = [
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
  ];

  const itinerary: GeneratedDayPlan[] = [];
  
  for (let i = 0; i < days; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    
    const dayActivities = mockActivities.map((activity, index) => ({
      ...activity,
      name: `${activity.name} - Day ${i + 1}`,
      cost: Math.floor(activity.cost * (0.8 + Math.random() * 0.4)) // Vary costs
    }));
    
    const totalCost = dayActivities.reduce((sum, activity) => sum + activity.cost, 0);
    const totalDuration = dayActivities.reduce((sum, activity) => sum + activity.duration, 0);
    
    itinerary.push({
      day: i + 1,
      date: currentDate.toISOString().split('T')[0],
      activities: dayActivities,
      totalCost,
      totalDuration
    });
  }
  
  console.log(`Generated ${itinerary.length} days of single-destination mock itinerary`);
  return itinerary;
}

// Multi-destination mock itinerary generator
function generateMultiDestinationMockItinerary(request: TripPlanRequest, totalDays: number): GeneratedDayPlan[] {
  const startDate = new Date(request.startDate);
  const destinations = request.destinations!;
  const itinerary: GeneratedDayPlan[] = [];
  
  console.log(`Generating multi-destination mock for ${totalDays} days with destinations:`, destinations.map(d => d.name));
  
  // AI-powered route optimization simulation
  let optimizedDestinations = [...destinations];
  
  if (request.tripType === 'multi_flexible') {
    // Simulate intelligent route optimization
    optimizedDestinations = optimizeRouteOrder(destinations, request.interests);
    console.log('Route optimized from:', destinations.map(d => d.name), 'to:', optimizedDestinations.map(d => d.name));
  }
  
  let currentDay = 1;
  let currentDate = new Date(startDate);
  
  // Calculate optimal day allocation
  const travelDays = Math.max(0, optimizedDestinations.length - 1);
  const availableDays = totalDays - travelDays;
  
  if (request.tripType === 'multi_flexible') {
    // Intelligent day allocation based on interests and destination importance
    const baseDaysPerDestination = Math.floor(availableDays / optimizedDestinations.length);
    const extraDays = availableDays % optimizedDestinations.length;
    
    optimizedDestinations = optimizedDestinations.map((dest, index) => ({
      ...dest,
      days: Math.max(2, baseDaysPerDestination + (index < extraDays ? 1 : 0))
    }));
  }
  
  for (let destIndex = 0; destIndex < destinations.length; destIndex++) {
    const destination = destinations[destIndex];
    const isLastDestination = destIndex === destinations.length - 1;
    
    // Calculate days for this destination
    const daysForDestination = destination.days;
    
    console.log(`Planning ${daysForDestination} days for ${destination.name}`);
    
    // Generate activities for each day in this destination
    for (let dayInDest = 0; dayInDest < daysForDestination; dayInDest++) {
      if (currentDay > totalDays) break;
      
      const mockActivities: GeneratedActivity[] = [
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
      ];
      
      const totalCost = mockActivities.reduce((sum, activity) => sum + activity.cost, 0);
      const totalDuration = mockActivities.reduce((sum, activity) => sum + activity.duration, 0);
      
      itinerary.push({
        day: currentDay,
        date: currentDate.toISOString().split('T')[0],
        activities: mockActivities,
        totalCost,
        totalDuration,
        destinationId: destination.id,
        destinationName: destination.name
      });
      
      currentDay++;
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Add travel day between destinations (except for the last one)
    if (!isLastDestination && currentDay <= totalDays) {
      const nextDestination = destinations[destIndex + 1];
      
      console.log(`Adding travel day from ${destination.name} to ${nextDestination.name}`);
      
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
        travelDetails: `Travel day from ${destination.name} to ${nextDestination.name}`
      });
      
      currentDay++;
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }
  
  // Ensure we have exactly the right number of days
  while (itinerary.length < totalDays && optimizedDestinations.length > 0) {
    const lastDestination = optimizedDestinations[optimizedDestinations.length - 1];
    const nextDate = new Date(startDate);
    nextDate.setDate(nextDate.getDate() + itinerary.length);
    
    console.log(`Adding extra day ${itinerary.length + 1} in ${lastDestination.name}`);
    
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
    });
  }
  
  console.log(`Generated ${itinerary.length} days of multi-destination mock itinerary`);
  return itinerary;
}

// Route optimization function for mock data
function optimizeRouteOrder(destinations: Array<{ id: string; name: string; days: number }>, interests: string[]): Array<{ id: string; name: string; days: number }> {
  console.log('Optimizing route for destinations:', destinations.map(d => d.name));
  console.log('Based on interests:', interests);
  
  // Simulate AI-powered route optimization
  const optimized = [...destinations];
  
  // Simple geographical optimization based on common Indian city knowledge
  const cityRegions: { [key: string]: { region: string; priority: number } } = {
    'mumbai': { region: 'west', priority: 1 },
    'goa': { region: 'west', priority: 2 },
    'pune': { region: 'west', priority: 3 },
    'bangalore': { region: 'south', priority: 1 },
    'chennai': { region: 'south', priority: 2 },
    'hyderabad': { region: 'south', priority: 3 },
    'kochi': { region: 'south', priority: 4 },
    'delhi': { region: 'north', priority: 1 },
    'agra': { region: 'north', priority: 2 },
    'jaipur': { region: 'north', priority: 3 },
    'kolkata': { region: 'east', priority: 1 },
    'bhubaneswar': { region: 'east', priority: 2 }
  };
  
  // Group destinations by region and sort by priority
  const regionGroups: { [key: string]: typeof destinations } = {};
  
  optimized.forEach(dest => {
    const destName = dest.name.toLowerCase();
    let region = 'other';
    let priority = 999;
    
    // Find matching city
    for (const [city, info] of Object.entries(cityRegions)) {
      if (destName.includes(city)) {
        region = info.region;
        priority = info.priority;
        break;
      }
    }
    
    if (!regionGroups[region]) {
      regionGroups[region] = [];
    }
    regionGroups[region].push({ ...dest, priority });
  });
  
  // Sort each region by priority and create optimized route
  const reordered: typeof destinations = [];
  
  // Process regions in logical order (north -> west -> south -> east)
  const regionOrder = ['north', 'west', 'south', 'east', 'other'];
  
  regionOrder.forEach(region => {
    if (regionGroups[region]) {
      const sortedRegionDests = regionGroups[region].sort((a: any, b: any) => a.priority - b.priority);
      reordered.push(...sortedRegionDests);
    }
  });
  
  // If interests include specific preferences, adjust allocation
  if (interests.includes('nature')) {
    // Prioritize destinations known for nature
    reordered.forEach(dest => {
      const destName = dest.name.toLowerCase();
      if (destName.includes('goa') || destName.includes('kochi') || destName.includes('manali')) {
        dest.days = Math.max(dest.days, dest.days + 1); // Add extra day for nature destinations
      }
    });
  }
  
  if (interests.includes('history')) {
    // Prioritize historical destinations
    reordered.forEach(dest => {
      const destName = dest.name.toLowerCase();
      if (destName.includes('agra') || destName.includes('jaipur') || destName.includes('delhi')) {
        dest.days = Math.max(dest.days, dest.days + 1); // Add extra day for historical destinations
      }
    });
  }
  
  console.log('Optimized route order:', reordered.map(d => d.name));
  return reordered.length > 0 ? reordered : optimized;
}