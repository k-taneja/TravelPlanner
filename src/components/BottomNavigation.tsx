import React from 'react';
import { Map, Calendar, Share2, Settings } from 'lucide-react';
import { AppScreen } from '../types';

interface BottomNavigationProps {
  currentScreen: AppScreen;
  onScreenChange: (screen: AppScreen) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ 
  currentScreen, 
  onScreenChange 
}) => {
  const navItems = [
    { screen: 'itinerary' as AppScreen, icon: Calendar, label: 'Plan' },
    { screen: 'map' as AppScreen, icon: Map, label: 'Map' },
    { screen: 'share' as AppScreen, icon: Share2, label: 'Share' },
    { screen: 'settings' as AppScreen, icon: Settings, label: 'Settings' },
  ];

  // Only show bottom nav on main app screens
  const showBottomNav = ['itinerary', 'map', 'share', 'settings'].includes(currentScreen);
  
  if (!showBottomNav) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 safe-area-bottom shadow-lg" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="flex items-center justify-around">
        {navItems.map(({ screen, icon: Icon, label }) => (
          <button
            key={screen}
            onClick={() => onScreenChange(screen)}
            className={`flex flex-col items-center py-2 px-3 rounded-xl transition-all duration-200 min-w-0 ${
              currentScreen === screen
                ? 'text-blue-500 bg-blue-50 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Icon className="h-6 w-6 mb-1" />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};