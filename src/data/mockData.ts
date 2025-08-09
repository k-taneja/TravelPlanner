import { TripData, Activity } from '../types';

export const mockActivities: Activity[] = [
  {
    id: '1',
    time: '09:00',
    name: 'Eiffel Tower Visit',
    type: 'attraction',
    description: 'Iconic iron tower with city views',
    duration: 120,
    cost: 25,
    location: {
      lat: 48.8584,
      lng: 2.2945,
      address: 'Champ de Mars, 5 Avenue Anatole France, 75007 Paris'
    },
    whyThis: 'Most iconic landmark in Paris, best views in the morning with fewer crowds'
  },
  {
    id: '2',
    time: '12:30',
    name: 'Café de Flore Lunch',
    type: 'food',
    description: 'Historic café with French cuisine',
    duration: 90,
    cost: 35,
    location: {
      lat: 48.8542,
      lng: 2.3320,
      address: '172 Boulevard Saint-Germain, 75006 Paris'
    },
    whyThis: 'Famous literary café, perfect for experiencing Parisian culture'
  },
  {
    id: '3',
    time: '15:00',
    name: 'Louvre Museum',
    type: 'attraction',
    description: 'World\'s largest art museum',
    duration: 180,
    cost: 17,
    location: {
      lat: 48.8606,
      lng: 2.3376,
      address: 'Rue de Rivoli, 75001 Paris'
    },
    whyThis: 'Must-see art collection including Mona Lisa, afternoon has shorter lines'
  }
];

export const mockTripData: TripData = {
  id: 'trip-001',
  destination: 'Paris, France',
  startDate: '2025-03-15',
  endDate: '2025-03-18',
  budget: 1200,
  pace: 'balanced',
  interests: ['history', 'food', 'art'],
  days: [
    {
      day: 1,
      date: '2025-03-15',
      activities: mockActivities,
      totalCost: 77,
      totalDuration: 390
    },
    {
      day: 2,
      date: '2025-03-16',
      activities: [
        {
          id: '4',
          time: '10:00',
          name: 'Notre-Dame Cathedral',
          type: 'history',
          description: 'Gothic cathedral masterpiece',
          duration: 90,
          cost: 0,
          location: {
            lat: 48.8530,
            lng: 2.3499,
            address: '6 Parvis Notre-Dame - Pl. Jean-Paul II, 75004 Paris'
          },
          whyThis: 'Architectural marvel, free to visit exterior and surroundings'
        },
        {
          id: '5',
          time: '14:00',
          name: 'Seine River Cruise',
          type: 'attraction',
          description: 'Scenic boat tour of Paris',
          duration: 60,
          cost: 15,
          location: {
            lat: 48.8566,
            lng: 2.3522,
            address: 'Port de Solférino, 75007 Paris'
          },
          whyThis: 'Relaxing way to see Paris landmarks from the water'
        }
      ],
      totalCost: 15,
      totalDuration: 150
    }
  ],
  totalCost: 92,
  createdAt: '2025-01-15T10:30:00Z'
};

export const travelQuotes = [
  "The world is a book and those who do not travel read only one page.",
  "Travel makes one modest. You see what a tiny place you occupy in the world.",
  "Adventure is worthwhile in itself.",
  "To travel is to live.",
  "Collect moments, not things."
];

export const interestOptions = [
  { id: 'nature', label: 'Nature & Outdoors', icon: '🌿' },
  { id: 'food', label: 'Food', icon: '🍽️' },
  { id: 'history', label: 'History & Culture', icon: '🏛️' },
  { id: 'shopping', label: 'Shopping', icon: '🛍️' },
  { id: 'adventure', label: 'Adventure & Sports', icon: '⛰️' },
  { id: 'art', label: 'Art', icon: '🎨' },
  { id: 'nightlife', label: 'Nightlife & Entertainment', icon: '🌙' },
  { id: 'social', label: 'Social & Personal', icon: '👥' }
];