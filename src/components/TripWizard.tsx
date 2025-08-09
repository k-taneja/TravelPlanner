import React, { useState } from 'react';
import { ArrowLeft, MapPin, Calendar, DollarSign, Clock, Search, Plane, User } from 'lucide-react';
import { interestOptions } from '../data/mockData';
import { getFilteredCities } from '../data/popularCities';
import { openRouterService } from '../services/openRouterService';
import { tripService } from '../services/tripService';
import { userPreferencesService } from '../services/userPreferencesService';
import { useAuth } from '../hooks/useAuth';

interface TripWizardProps {
  onComplete: (tripId: string) => void;
  onBack: () => void;
}

export const TripWizard: React.FC<TripWizardProps> = ({ onComplete, onBack }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    from: '',
    to: '',
    startDate: '',
    endDate: '',
    budget: 80000,
    pace: 'balanced' as 'relaxed' | 'balanced' | 'fast',
    interests: [] as string[]
  });

  const [showFromSuggestions, setShowFromSuggestions] = useState(false);
  const [showToSuggestions, setShowToSuggestions] = useState(false);
  const [filteredFromSuggestions, setFilteredFromSuggestions] = useState<string[]>([]);
  const [filteredToSuggestions, setFilteredToSuggestions] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('Please sign in to create a trip');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get user preferences for enhanced itinerary generation
      let userPreferences = null;
      if (user) {
        userPreferences = await userPreferencesService.getUserPreferences(user.id);
      }

      // Generate itinerary using OpenRouter
      const itinerary = await openRouterService.generateItinerary({
        destination: formData.to,
        startDate: formData.startDate,
        endDate: formData.endDate,
        budget: formData.budget,
        pace: formData.pace,
        interests: formData.interests,
        from: formData.from,
        userPreferences
      });

      // Create trip in database
      const trip = await tripService.createTrip({
        user_id: user.id,
        destination: formData.to,
        start_date: formData.startDate,
        end_date: formData.endDate,
        budget: formData.budget,
        pace: formData.pace,
        interests: formData.interests,
        total_cost: itinerary.reduce((sum, day) => sum + day.totalCost, 0)
      });

      // Create day plans and activities
      for (const dayPlan of itinerary) {
        const createdDayPlan = await tripService.createDayPlan({
          trip_id: trip.id,
          day_number: dayPlan.day,
          date: dayPlan.date,
          total_cost: dayPlan.totalCost,
          total_duration: dayPlan.totalDuration
        });

        // Create activities for this day
        for (let i = 0; i < dayPlan.activities.length; i++) {
          const activity = dayPlan.activities[i];
          await tripService.createActivity({
            day_plan_id: createdDayPlan.id,
            time: activity.time,
            name: activity.name,
            type: activity.type,
            description: activity.description,
            duration: activity.duration,
            cost: activity.cost,
            location_lat: activity.location.lat,
            location_lng: activity.location.lng,
            location_address: activity.location.address,
            why_this: activity.whyThis,
            order_index: i
          });
        }
      }

      onComplete(trip.id);
    } catch (err) {
      console.error('Error creating trip:', err);
      setError(err instanceof Error ? err.message : 'Failed to create trip');
    } finally {
      setLoading(false);
    }
  };

  const toggleInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const handleFromChange = (value: string) => {
    setFormData(prev => ({ ...prev, from: value }));
    const filtered = getFilteredCities(value);
    setFilteredFromSuggestions(filtered);
    setShowFromSuggestions(value.length >= 3 && filtered.length > 0);
  };

  const handleToChange = (value: string) => {
    setFormData(prev => ({ ...prev, to: value }));
    const filtered = getFilteredCities(value);
    setFilteredToSuggestions(filtered);
    setShowToSuggestions(value.length >= 3 && filtered.length > 0);
  };

  const selectFromDestination = (destination: string) => {
    setFormData(prev => ({ ...prev, from: destination }));
    setShowFromSuggestions(false);
  };

  const selectToDestination = (destination: string) => {
    setFormData(prev => ({ ...prev, to: destination }));
    setShowToSuggestions(false);
  };

  const isFormValid = () => {
    return formData.from && formData.to && formData.startDate && formData.endDate && formData.interests.length > 0;
  };

  return (
    <div className="min-h-screen bg-slate-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Fixed Top Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <button
                onClick={onBack}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors duration-200 mr-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#ff497c' }}>
                <Plane className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Planora</span>
            </div>

            {/* Right Icons */}
            <div className="flex items-center space-x-3">
              <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors duration-200">
                <User className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-16">
        <div className="px-4 sm:px-6 lg:px-8 py-12 max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(to right, #ff497c, #a855f7)' }}>
                Plan Your Perfect Trip
              </span>
            </h1>
            <p className="text-slate-400 text-lg">
              Tell us your preferences and we'll create your ideal itinerary
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* From and To Locations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* From Location */}
              <div>
                <label className="block text-sm font-semibold text-white mb-3">
                  From
                </label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Departure city..."
                    value={formData.from}
                    onChange={(e) => handleFromChange(e.target.value)}
                    onFocus={() => setShowFromSuggestions(formData.from.length >= 3 && filteredFromSuggestions.length > 0)}
                    onBlur={() => setTimeout(() => setShowFromSuggestions(false), 200)}
                    className="w-full pl-12 pr-4 py-4 border border-slate-600 rounded-xl focus:ring-2 focus:border-transparent bg-slate-800 text-white placeholder-slate-400 text-lg"
                    style={{ '--tw-ring-color': '#ff497c' }}
                    required
                  />
                  
                  {/* From Autocomplete Suggestions */}
                  {showFromSuggestions && filteredFromSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl z-20 max-h-64 overflow-y-auto">
                      {filteredFromSuggestions.map((destination) => (
                        <button
                          key={destination}
                          type="button"
                          onClick={() => selectFromDestination(destination)}
                          className="w-full px-4 py-3 text-left text-white hover:bg-slate-700 transition-colors duration-200 first:rounded-t-xl last:rounded-b-xl flex items-center space-x-3"
                        >
                          <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0" />
                          <span className="text-sm">{destination}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* To Location */}
              <div>
                <label className="block text-sm font-semibold text-white mb-3">
                  To
                </label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Destination city..."
                    value={formData.to}
                    onChange={(e) => handleToChange(e.target.value)}
                    onFocus={() => setShowToSuggestions(formData.to.length >= 3 && filteredToSuggestions.length > 0)}
                    onBlur={() => setTimeout(() => setShowToSuggestions(false), 200)}
                    className="w-full pl-12 pr-4 py-4 border border-slate-600 rounded-xl focus:ring-2 focus:border-transparent bg-slate-800 text-white placeholder-slate-400 text-lg"
                    style={{ '--tw-ring-color': '#ff497c' }}
                    required
                  />
                  
                  {/* To Autocomplete Suggestions */}
                  {showToSuggestions && filteredToSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl z-20 max-h-64 overflow-y-auto">
                      {filteredToSuggestions.map((destination) => (
                        <button
                          key={destination}
                          type="button"
                          onClick={() => selectToDestination(destination)}
                          className="w-full px-4 py-3 text-left text-white hover:bg-slate-700 transition-colors duration-200 first:rounded-t-xl last:rounded-b-xl flex items-center space-x-3"
                        >
                          <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0" />
                          <span className="text-sm">{destination}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-white mb-3">
                  Start Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full pl-12 pr-4 py-4 border border-slate-600 rounded-xl focus:ring-2 focus:border-transparent bg-slate-800 text-white text-lg [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-70 [&::-webkit-calendar-picker-indicator]:hover:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    style={{ 
                      '--tw-ring-color': '#ff497c',
                      colorScheme: 'dark'
                    }}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-white mb-3">
                  End Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full pl-12 pr-4 py-4 border border-slate-600 rounded-xl focus:ring-2 focus:border-transparent bg-slate-800 text-white text-lg [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-70 [&::-webkit-calendar-picker-indicator]:hover:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    style={{ 
                      '--tw-ring-color': '#ff497c',
                      colorScheme: 'dark'
                    }}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Budget */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-white">
                  Budget
                </label>
                <span className="text-lg font-bold" style={{ color: '#ff497c' }}>₹{formData.budget.toLocaleString('en-IN')}</span>
              </div>
              <input
                type="range"
                min="10000"
                max="500000"
                step="5000"
                value={formData.budget}
                onChange={(e) => setFormData(prev => ({ ...prev, budget: parseInt(e.target.value) }))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #ff497c 0%, #ff497c ${((formData.budget - 10000) / (500000 - 10000)) * 100}%, #475569 ${((formData.budget - 10000) / (500000 - 10000)) * 100}%, #475569 100%)`
                }}
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>₹10,000</span>
                <span>₹2,55,000</span>
                <span>₹5,00,000+</span>
              </div>
            </div>
            {/* Travel Pace */}
            <div>
              <label className="block text-sm font-semibold text-white mb-3">
                Travel Pace
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'relaxed', label: 'Relaxed' },
                  { value: 'balanced', label: 'Balanced' },
                  { value: 'fast', label: 'Fast' }
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, pace: value as any }))}
                    className={`p-3 rounded-xl border transition-all duration-200 text-center ${
                      formData.pace === value
                        ? 'border-2 bg-slate-800 text-white'
                        : 'border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white bg-slate-800/50'
                    }`}
                    style={{
                      borderColor: formData.pace === value ? '#ff497c' : undefined
                    }}
                  >
                    <div className="text-sm font-medium">{label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Interests */}
            <div>
              <label className="block text-sm font-semibold text-white mb-3">
                What interests you?
              </label>
              <div className="grid grid-cols-4 gap-2">
                {interestOptions.map((interest) => (
                  <button
                    key={interest.id}
                    type="button"
                    onClick={() => toggleInterest(interest.id)}
                    className={`p-3 rounded-xl border transition-all duration-200 text-center ${
                      formData.interests.includes(interest.id)
                        ? 'border-2 bg-slate-800 text-white'
                        : 'border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white bg-slate-800/50'
                    }`}
                    style={{
                      borderColor: formData.interests.includes(interest.id) ? '#ff497c' : undefined
                    }}
                  >
                    <div className="text-lg mb-1">{interest.icon}</div>
                    <div className="text-xs font-medium">{interest.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!isFormValid() || loading}
              className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-200 ${
                isFormValid() && !loading
                  ? 'bg-transparent border-2 text-white hover:scale-[0.98] shadow-lg hover:shadow-xl'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed border-2 border-slate-600'
              }`}
              style={{ 
                borderColor: isFormValid() && !loading ? '#ff497c' : undefined,
                backgroundColor: isFormValid() && !loading ? 'transparent' : undefined
              }}
              onMouseEnter={(e) => {
                if (isFormValid() && !loading) {
                  e.currentTarget.style.backgroundColor = '#ff497c';
                }
              }}
              onMouseLeave={(e) => {
                if (isFormValid() && !loading) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {loading ? 'Generating Itinerary...' : 'Generate My Itinerary ✨'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};