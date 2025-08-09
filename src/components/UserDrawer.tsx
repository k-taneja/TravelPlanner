import React, { useState, useEffect } from 'react';
import { X, Archive, Settings, LogOut, Clock, Save, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { tripService } from '../services/tripService';

interface UserDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSignOut: () => void;
  onSettings?: () => void;
}

interface UserSettings {
  startTime: string;
  endTime: string;
  foodPreferences?: string;
  dietaryRestrictions?: string;
  travelStyle?: string;
  accommodationType?: string;
}

export const UserDrawer: React.FC<UserDrawerProps> = ({ isOpen, onClose, onSignOut, onSettings }) => {
  const { user } = useAuth();
  const [showArchivedTrips, setShowArchivedTrips] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({
    startTime: '09:00',
    endTime: '21:00',
    foodPreferences: 'all',
    dietaryRestrictions: '',
    travelStyle: 'standard',
    accommodationType: 'hotel'
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [archivedTrips, setArchivedTrips] = useState<any[]>([]);
  const [archivedTripsLoading, setArchivedTripsLoading] = useState(false);

  // Load archived trips from database
  const loadArchivedTrips = async () => {
    if (!user) return;
    
    setArchivedTripsLoading(true);
    try {
      const trips = await tripService.getArchivedTrips(user.id);
      
      // Transform database trips to UI format
      const transformedTrips = trips.map(trip => {
        const startDate = new Date(trip.start_date);
        const endDate = new Date(trip.end_date);
        
        // Get destination image based on location
        const getDestinationImage = (destination: string) => {
          const images: { [key: string]: string } = {
            'paris': 'https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg?auto=compress&cs=tinysrgb&w=300',
            'tokyo': 'https://images.pexels.com/photos/248195/pexels-photo-248195.jpeg?auto=compress&cs=tinysrgb&w=300',
            'new york': 'https://images.pexels.com/photos/466685/pexels-photo-466685.jpeg?auto=compress&cs=tinysrgb&w=300',
            'london': 'https://images.pexels.com/photos/460672/pexels-photo-460672.jpeg?auto=compress&cs=tinysrgb&w=300',
            'rome': 'https://images.pexels.com/photos/2064827/pexels-photo-2064827.jpeg?auto=compress&cs=tinysrgb&w=300',
            'bali': 'https://images.pexels.com/photos/2474690/pexels-photo-2474690.jpeg?auto=compress&cs=tinysrgb&w=300'
          };
          
          const key = destination.toLowerCase();
          for (const [city, image] of Object.entries(images)) {
            if (key.includes(city)) {
              return image;
            }
          }
          return 'https://images.pexels.com/photos/1008155/pexels-photo-1008155.jpeg?auto=compress&cs=tinysrgb&w=300';
        };
        
        return {
          id: trip.id,
          destination: trip.destination,
          dates: `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
          status: 'completed',
          image: getDestinationImage(trip.destination)
        };
      });
      
      setArchivedTrips(transformedTrips);
    } catch (error) {
      console.error('Error loading archived trips:', error);
    } finally {
      setArchivedTripsLoading(false);
    }
  };

  // Load archived trips when modal opens
  useEffect(() => {
    if (showArchivedTrips && user) {
      loadArchivedTrips();
    }
  }, [showArchivedTrips, user]);

  const handleDrawerItemClick = (action: string) => {
    switch (action) {
      case 'archived':
        setShowArchivedTrips(true);
        break;
      case 'settings':
        onClose(); // Close drawer first
        if (onSettings) {
          onSettings();
        } else {
          // Fallback to modal if navigation not implemented
          setShowSettings(true);
        }
        break;
      case 'signout':
        onSignOut();
        onClose();
        break;
    }
  };

  const validateTimeSettings = (start: string, end: string): string | null => {
    const startTime = new Date(`2000-01-01T${start}:00`);
    const endTime = new Date(`2000-01-01T${end}:00`);
    
    if (endTime <= startTime) {
      return 'End time must be after start time';
    }
    
    const timeDiff = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    if (timeDiff < 4) {
      return 'Planning window must be at least 4 hours';
    }
    
    return null;
  };

  const handleSaveSettings = async () => {
    setValidationError(null);
    setSettingsError(null);
    
    // Validate time settings
    const validation = validateTimeSettings(settings.startTime, settings.endTime);
    if (validation) {
      setValidationError(validation);
      return;
    }
    
    setSettingsLoading(true);
    
    try {
      // Simulate API call to save settings
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real app, you would save to Supabase here:
      // await supabase.from('user_settings').upsert({
      //   user_id: user?.id,
      //   start_time: settings.startTime,
      //   end_time: settings.endTime
      // });
      
      console.log('Settings saved:', settings);
      setShowSettings(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSettingsError('Failed to save settings. Please try again.');
    } finally {
      setSettingsLoading(false);
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-80 bg-slate-800 shadow-2xl z-50 transform transition-transform duration-300 ease-out">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            <h2 className="text-lg font-bold text-white">Account</h2>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors duration-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* User Info */}
          <div className="p-6 border-b border-slate-700">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  {user?.email ? user.email.charAt(0).toUpperCase() : 'G'}
                </span>
              </div>
              <div>
                <div className="font-semibold text-white">
                  {user?.email ? user.email.split('@')[0] : 'Guest User'}
                </div>
                <div className="text-sm text-slate-400">
                  {user?.email || 'guest@planora.app'}
                </div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="flex-1 p-6">
            <nav className="space-y-2">
              <button
                onClick={() => handleDrawerItemClick('archived')}
                className="w-full flex items-center space-x-3 px-4 py-3 text-left text-slate-300 hover:text-white hover:bg-slate-700 rounded-xl transition-all duration-200"
              >
                <Archive className="h-5 w-5" />
                <span className="font-medium">Archived Trips</span>
              </button>
              
              <button
                onClick={() => handleDrawerItemClick('settings')}
                className="w-full flex items-center space-x-3 px-4 py-3 text-left text-slate-300 hover:text-white hover:bg-slate-700 rounded-xl transition-all duration-200"
              >
                <Settings className="h-5 w-5" />
                <span className="font-medium">Settings</span>
              </button>
              
              <button
                onClick={() => handleDrawerItemClick('signout')}
                className="w-full flex items-center space-x-3 px-4 py-3 text-left text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all duration-200"
              >
                <LogOut className="h-5 w-5" />
                <span className="font-medium">Sign Out</span>
              </button>
            </nav>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-700">
            <div className="text-center text-slate-500 text-sm">
              <p>Planora v1.0.0</p>
              <p>Made with ❤️ for travelers</p>
            </div>
          </div>
        </div>
      </div>

      {/* Archived Trips Modal */}
      {showArchivedTrips && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div 
            className="bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden border border-slate-600 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h3 className="text-xl font-bold text-white">Archived Trips</h3>
              <button
                onClick={() => setShowArchivedTrips(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors duration-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {archivedTripsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400 mx-auto mb-4"></div>
                  <p className="text-slate-400">Loading archived trips...</p>
                </div>
              ) : archivedTrips.length === 0 ? (
                <div className="text-center py-12">
                  <Archive className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-white mb-2">No Archived Trips</h4>
                  <p className="text-slate-400">Your completed trips will appear here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {archivedTrips.map((trip) => (
                    <div
                      key={trip.id}
                      className="bg-slate-700 rounded-xl overflow-hidden hover:bg-slate-600 transition-colors duration-200 cursor-pointer"
                    >
                      <div className="relative h-32">
                        <img
                          src={trip.image}
                          alt={trip.destination}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                        <div className="absolute bottom-2 left-3 right-3">
                          <h4 className="font-semibold text-white text-sm">{trip.destination}</h4>
                          <p className="text-xs text-slate-300">{trip.dates}</p>
                        </div>
                      </div>
                      <div className="p-3">
                        <span className="inline-block px-2 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full">
                          Completed
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div 
            className="bg-slate-800 rounded-2xl w-full max-w-md border border-slate-600 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <h3 className="text-xl font-bold text-white">Settings</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors duration-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-white mb-2 flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Day Planning Times
                </h4>
                <p className="text-sm text-slate-400 mb-4">
                  Set your preferred planning window. This helps our AI model create itineraries that match your daily schedule.
                </p>
              </div>

              {/* Error Messages */}
              {validationError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                  <span className="text-sm text-red-400">{validationError}</span>
                </div>
              )}

              {settingsError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                  <span className="text-sm text-red-400">{settingsError}</span>
                </div>
              )}

              {/* Time Settings Form */}
              <div className="space-y-4">
                {/* Start Time */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={settings.startTime}
                    onChange={(e) => setSettings(prev => ({ ...prev, startTime: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Current: {formatTime(settings.startTime)}
                  </p>
                </div>

                {/* End Time */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={settings.endTime}
                    onChange={(e) => setSettings(prev => ({ ...prev, endTime: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Current: {formatTime(settings.endTime)}
                  </p>
                </div>

                {/* Food Preferences */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Food Preferences
                  </label>
                  <select
                    value={settings.foodPreferences || 'all'}
                    onChange={(e) => setSettings(prev => ({ ...prev, foodPreferences: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  >
                    <option value="all">All Cuisines</option>
                    <option value="vegetarian">Vegetarian</option>
                    <option value="vegan">Vegan</option>
                    <option value="local">Local Cuisine Only</option>
                    <option value="international">International Cuisine</option>
                    <option value="street_food">Street Food Lover</option>
                    <option value="fine_dining">Fine Dining</option>
                  </select>
                </div>

                {/* Dietary Restrictions */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Dietary Restrictions
                  </label>
                  <input
                    type="text"
                    value={settings.dietaryRestrictions || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, dietaryRestrictions: e.target.value }))}
                    placeholder="e.g., No pork, Gluten-free, Nut allergy"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>

                {/* Travel Style */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Travel Style
                  </label>
                  <select
                    value={settings.travelStyle || 'standard'}
                    onChange={(e) => setSettings(prev => ({ ...prev, travelStyle: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  >
                    <option value="budget">Budget Traveler</option>
                    <option value="standard">Standard</option>
                    <option value="luxury">Luxury</option>
                    <option value="backpacker">Backpacker</option>
                    <option value="family">Family Friendly</option>
                    <option value="solo">Solo Traveler</option>
                    <option value="couple">Couple</option>
                  </select>
                </div>

                {/* Accommodation Preference */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Accommodation Preference
                  </label>
                  <select
                    value={settings.accommodationType || 'hotel'}
                    onChange={(e) => setSettings(prev => ({ ...prev, accommodationType: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  >
                    <option value="hostel">Hostel</option>
                    <option value="budget_hotel">Budget Hotel</option>
                    <option value="hotel">Mid-range Hotel</option>
                    <option value="luxury_hotel">Luxury Hotel</option>
                    <option value="resort">Resort</option>
                    <option value="airbnb">Airbnb/Homestay</option>
                    <option value="boutique">Boutique Hotel</option>
                  </select>
                </div>
              </div>

              {/* Info Box */}
              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <h5 className="text-sm font-semibold text-blue-400 mb-2">How this helps:</h5>
                <ul className="text-xs text-blue-300 space-y-1">
                  <li>• AI plans activities within your preferred hours</li>
                  <li>• Better scheduling for early birds or night owls</li>
                  <li>• Accounts for rest time and meal breaks</li>
                  <li>• Optimizes travel time between locations</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowSettings(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSettings}
                  disabled={settingsLoading}
                  className="flex-1 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {settingsLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Save Settings</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};