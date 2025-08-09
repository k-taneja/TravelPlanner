import React from 'react';
import { ArrowLeft, RefreshCw, WifiOff, Calendar, Clock, DollarSign } from 'lucide-react';
import { mockTripData } from '../data/mockData';

interface OfflineViewProps {
  onBack: () => void;
}

export const OfflineView: React.FC<OfflineViewProps> = ({ onBack }) => {
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={onBack}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors duration-200 mr-3"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Offline Mode</h1>
          </div>
          <div className="flex items-center space-x-2 text-orange-600">
            <WifiOff className="h-5 w-5" />
            <span className="text-sm font-medium">Offline</span>
          </div>
        </div>
      </div>

      {/* Offline Banner */}
      <div className="bg-orange-50 border-b border-orange-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-orange-800">You're viewing cached content</p>
            <p className="text-sm text-orange-600">Connect to internet for updates</p>
          </div>
          <button className="flex items-center space-x-2 px-4 py-2 bg-orange-100 text-orange-800 rounded-xl hover:bg-orange-200 transition-all duration-200">
            <RefreshCw className="h-4 w-4" />
            <span className="text-sm font-medium">Refresh</span>
          </button>
        </div>
      </div>

      {/* Trip Content */}
      <div className="px-6 py-6">
        {/* Trip Header */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{mockTripData.destination}</h2>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              {mockTripData.startDate} - {mockTripData.endDate}
            </div>
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 mr-1" />
              ${mockTripData.totalCost}
            </div>
          </div>
        </div>

        {/* Days */}
        <div className="space-y-6">
          {mockTripData.days.map((day) => (
            <div key={day.day} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4">
                <h3 className="text-lg font-bold">
                  Day {day.day} - {new Date(day.date).toLocaleDateString('en-US', { 
                    weekday: 'long',
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </h3>
                <div className="flex items-center space-x-4 text-sm opacity-90 mt-1">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {Math.floor(day.totalDuration / 60)}h {day.totalDuration % 60}m
                  </div>
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 mr-1" />
                    ${day.totalCost}
                  </div>
                </div>
              </div>
              
              <div className="p-4 space-y-4">
                {day.activities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-4 p-3 bg-gray-50 rounded-xl">
                    <div className="text-center flex-shrink-0">
                      <div className="text-sm font-semibold text-blue-600">
                        {formatTime(activity.time)}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">{activity.name}</h4>
                      <p className="text-gray-600 text-sm mb-2">{activity.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {activity.duration}min
                        </div>
                        <div className="flex items-center">
                          <DollarSign className="h-3 w-3 mr-1" />
                          ${activity.cost}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Offline Notice */}
        <div className="mt-8 bg-gray-100 rounded-xl p-6 text-center">
          <WifiOff className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <h3 className="font-semibold text-gray-700 mb-2">Limited Functionality</h3>
          <p className="text-sm text-gray-600">
            Maps, sharing, and editing features require internet connection.
          </p>
        </div>
      </div>
    </div>
  );
};