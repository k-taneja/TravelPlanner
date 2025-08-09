export interface Activity {
  id: string;
  time: string;
  name: string;
  type: 'attraction' | 'food' | 'transport' | 'shopping' | 'nature' | 'history';
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

export interface DayPlan {
  day: number;
  date: string;
  activities: Activity[];
  totalCost: number;
  totalDuration: number;
}

export interface TripData {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  pace: 'relaxed' | 'balanced' | 'fast';
  interests: string[];
  days: DayPlan[];
  totalCost: number;
  createdAt: string;
}

export interface WizardStep {
  step: number;
  title: string;
  description: string;
}

export type AppScreen = 
  | 'login'
  | 'dashboard'
  | 'wizard'
  | 'loading'
  | 'itinerary'
  | 'map'
  | 'share'
  | 'settings'
  | 'offline';