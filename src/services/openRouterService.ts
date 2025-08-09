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