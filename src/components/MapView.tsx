import React, { useState } from 'react';
import { ArrowLeft, Navigation, Clock, Route, MapPin } from 'lucide-react';
import { GoogleMapComponent } from './GoogleMapComponent';

interface MapViewProps {
  tripData?: any;
  onBack: () => void;
}

export const MapView: React.FC<MapViewProps> = ({ tripData, onBack }) => {
  const [selectedDay, setSelectedDay] = useState(1);
  
  // Use tripData if provided, otherwise fall back to mock data for demo
  const currentTrip = tripData || {
    destination: 'Paris, France',
    days: [
      {
        day: 1,
        activities: [
          {
            id: '1',
            name: 'Eiffel Tower',
            time: '09:00',
            location: { lat: 48.8584, lng: 2.2945 },
            duration: 120
          }
        ]
      }
    ]
  };
  
  const currentDay = currentTrip.days.find((day: any) => day.day === selectedDay);
  
  const dayColors = [
    'bg-red-500',
    'bg-blue-500', 
    'bg-green-500',
    'bg-purple-500',
    'bg-orange-500'
  ];

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Mock Map Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-green-50">
        <div className="absolute inset-0 opacity-20">
          {/* Simulate map streets */}
          <svg className="w-full h-full" viewBox="0 0 400 800">
            <path d="M50 100 L350 120 L340 200 L60 180 Z" fill="none" stroke="#ccc" strokeWidth="4"/>
            <path d="M100 50 L110 750 M200 40 L210 760 M300 45 L310 755" stroke="#ddd" strokeWidth="2"/>
            <path d="M20 200 L380 210 M25 350 L375 360 M30 500 L370 510 M35 650 L365 660" stroke="#ddd" strokeWidth="2"/>
          </svg>
        </div>
      </div>

      {/* Header */}
      <div className="relative z-10 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors duration-200"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Route Map</h1>
          <button className="p-2 rounded-xl hover:bg-gray-100 transition-colors duration-200">
            <Navigation className="h-6 w-6" />
          </button>
        </div>

        {/* Day Selector */}
        <div className="px-6 pb-4">
          <div className="flex space-x-2 overflow-x-auto">
            {currentTrip.days.map((day: any, index: number) => (
              <button
                key={day.day}
                onClick={() => setSelectedDay(day.day)}
                className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all duration-200 flex items-center space-x-2 font-medium ${
                  selectedDay === day.day
                    ? `${dayColors[index]} text-white shadow-sm`
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <div className={`w-3 h-3 rounded-full ${selectedDay === day.day ? 'bg-white' : dayColors[index]}`} />
                <span>Day {day.day}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Google Map */}
      {currentDay && (
        <div className="relative z-10 flex-1 h-96">
          <GoogleMapComponent
            activities={currentDay.activities}
            center={
              currentDay.activities.length > 0 && currentDay.activities[0].location
                ? {
                    lat: currentDay.activities[0].location.lat,
                    lng: currentDay.activities[0].location.lng
                  }
                : { lat: 48.8566, lng: 2.3522 } // Default to Paris
            }
          />
        </div>
      )}

      {/* Bottom Stats */}
      {currentDay && (
        <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 p-6 shadow-lg">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">{currentDay.activities.length}</div>
              <div className="text-sm text-gray-600">Activities</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {currentDay.totalDuration ? Math.floor(currentDay.totalDuration / 60) : 0}h
              </div>
              <div className="text-sm text-gray-600">Duration</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                ${currentDay.totalCost || 0}
              </div>
              <div className="text-sm text-gray-600">Cost</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};