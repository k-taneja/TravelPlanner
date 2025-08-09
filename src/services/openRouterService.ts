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
  destinationId?: string;
  destinationName?: string;
  isTravel?: boolean;
  travelDetails?: string;
}

export const openRouterService = {
  async generateItinerary(request: TripPlanRequest): Promise<GeneratedDayPlan[]> {
    try {
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
  
  // Handle multi-destination trips
  if (request.isMultiDestination && request.destinations) {
    return generateMultiDestinationMockItinerary(request, days);
  }
  
  // Single destination logic (existing)
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
  
  return itinerary;
}

// Multi-destination mock itinerary generator
function generateMultiDestinationMockItinerary(request: TripPlanRequest, totalDays: number): GeneratedDayPlan[] {
  const startDate = new Date(request.startDate);
  const destinations = request.destinations!;
  const itinerary: GeneratedDayPlan[] = [];
  
  let currentDay = 1;
  let currentDate = new Date(startDate);
  
  for (let destIndex = 0; destIndex < destinations.length; destIndex++) {
    const destination = destinations[destIndex];
    const isLastDestination = destIndex === destinations.length - 1;
    
    // Calculate days for this destination
    let daysForDestination = destination.days;
    if (request.tripType === 'multi_flexible') {
      // AI would optimize this, for mock we'll distribute evenly
      daysForDestination = Math.floor(totalDays / destinations.length);
      if (destIndex < totalDays % destinations.length) {
        daysForDestination += 1;
      }
    }
    
    // Generate activities for each day in this destination
    for (let dayInDest = 0; dayInDest < daysForDestination; dayInDest++) {
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
  
  return itinerary;
}

// Multi-destination mock itinerary generator
function generateMultiDestinationMockItinerary(request: TripPlanRequest, totalDays: number): GeneratedDayPlan[] {
  const startDate = new Date(request.startDate);
  const destinations = request.destinations!;
  const itinerary: GeneratedDayPlan[] = [];
  
  let currentDay = 1;
  let currentDate = new Date(startDate);
  
  for (let destIndex = 0; destIndex < destinations.length; destIndex++) {
    const destination = destinations[destIndex];
    const isLastDestination = destIndex === destinations.length - 1;
    
    // Calculate days for this destination
    let daysForDestination = destination.days;
    if (request.tripType === 'multi_flexible') {
      // AI would optimize this, for mock we'll distribute evenly
      daysForDestination = Math.floor(totalDays / destinations.length);
      if (destIndex < totalDays % destinations.length) {
        daysForDestination += 1;
      }
    }
    
    // Generate activities for each day in this destination
    for (let dayInDest = 0; dayInDest < daysForDestination; dayInDest++) {
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
  
  return itinerary;
}