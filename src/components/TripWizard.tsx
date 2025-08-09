import React, { useState } from 'react';
import { ArrowLeft, MapPin, Calendar, DollarSign, Clock, Search, Plane, User, Plus, X, Route } from 'lucide-react';
import { interestOptions } from '../data/mockData';
import { getFilteredCities } from '../data/popularCities';
import { openRouterService } from '../services/openRouterService';
import { tripService } from '../services/tripService';
import { userPreferencesService } from '../services/userPreferencesService';
import { useAuth } from '../hooks/useAuth';

interface Destination {
  id: string;
  name: string;
  days: number;
}

interface TripWizardProps {
  onComplete: (tripId: string) => void;
  onBack: () => void;
}

export const TripWizard: React.FC<TripWizardProps> = ({ onComplete, onBack }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tripType, setTripType] = useState<'single' | 'multi_fixed' | 'multi_flexible'>('single');
  const [destinations, setDestinations] = useState<Destination[]>([
    { id: '1', name: '', days: 3 }
  ]);
  const [formData, setFormData] = useState({
    from: '',
    to: '',
    startDate: '',
    endDate: '',
    budget: 80000,
    pace: 'balanced' as 'relaxed' | 'balanced' | 'fast',
    interests: [] as string[],
    totalDays: 7
  });

  const [showFromSuggestions, setShowFromSuggestions] = useState(false);
  const [showToSuggestions, setShowToSuggestions] = useState(false);
  const [showDestinationSuggestions, setShowDestinationSuggestions] = useState<string | null>(null);
  const [filteredFromSuggestions, setFilteredFromSuggestions] = useState<string[]>([]);
  const [filteredToSuggestions, setFilteredToSuggestions] = useState<string[]>([]);
  const [filteredDestinationSuggestions, setFilteredDestinationSuggestions] = useState<string[]>([]);

  const addDestination = () => {
    const newDestination: Destination = {
      id: Date.now().toString(),
      name: '',
      days: 3
    };
    setDestinations([...destinations, newDestination]);
  };

  const removeDestination = (id: string) => {
    if (destinations.length > 1) {
      setDestinations(destinations.filter(dest => dest.id !== id));
    }
  };

  const updateDestination = (id: string, field: 'name' | 'days', value: string | number) => {
    setDestinations(destinations.map(dest => 
      dest.id === id ? { ...dest, [field]: value } : dest
    ));
  };

  const handleDestinationChange = (id: string, value: string) => {
    updateDestination(id, 'name', value);
    const filtered = getFilteredCities(value);
    setFilteredDestinationSuggestions(filtered);
    setShowDestinationSuggestions(value.length >= 3 && filtered.length > 0 ? id : null);
  };

  const selectDestination = (id: string, destination: string) => {
    updateDestination(id, 'name', destination);
    setShowDestinationSuggestions(null);
  };

  const calculateTotalDays = () => {
    return destinations.reduce((total, dest) => total + dest.days, 0);
  };

  const getTripTypeDescription = () => {
    switch (tripType) {
      case 'single':
        return 'Visit one destination for your entire trip';
      case 'multi_fixed':
        return 'Specify exact days for each destination';
      case 'multi_flexible':
        return 'Let AI suggest optimal time allocation';
      default:
        return '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('Please sign in to create a trip');
      return;
    }

    // Validate multi-destination trips
    if (tripType !== 'single') {
      const hasEmptyDestinations = destinations.some(dest => !dest.name.trim());
      if (hasEmptyDestinations) {
        setError('Please fill in all destination names');
        return;
      }

      if (tripType === 'multi_fixed') {
        const totalDays = calculateTotalDays();
        const tripDuration = Math.ceil((new Date(formData.endDate).getTime() - new Date(formData.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        if (totalDays !== tripDuration) {
          setError(`Total destination days (${totalDays}) must equal trip duration (${tripDuration} days)`);
          return;
        }
      }
    }

    setLoading(true);
    setError(null);

    try {
      // Get user preferences for enhanced itinerary generation
      let userPreferences = null;
      if (user) {
        userPreferences = await userPreferencesService.getUserPreferences(user.id);
      }

      // Prepare request based on trip type
      const requestData = {
        destination: tripType === 'single' ? formData.to : destinations.map(d => d.name).join(', '),
        startDate: formData.startDate,
        endDate: formData.endDate,
        budget: formData.budget,
        pace: formData.pace,
        interests: formData.interests,
        from: formData.from,
        userPreferences,
        tripType,
        destinations: tripType !== 'single' ? destinations : undefined,
        isMultiDestination: tripType !== 'single'
      };

      // Generate itinerary using OpenRouter
      const itinerary = await openRouterService.generateItinerary(requestData);

      console.log('Generated itinerary:', itinerary.length, 'days');
      
      // Validate that we have the expected number of days
      const expectedDays = Math.ceil((new Date(formData.endDate).getTime() - new Date(formData.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (itinerary.length !== expectedDays) {
        console.warn(`Expected ${expectedDays} days, got ${itinerary.length} days`);
      }

      // Create trip in database
      const trip = await tripService.createTrip({
        user_id: user.id,
        destination: tripType === 'single' ? formData.to : destinations.map(d => d.name).join(' → '),
        start_date: formData.startDate,
        end_date: formData.endDate,
        budget: formData.budget,
        pace: formData.pace,
        interests: formData.interests,
        total_cost: itinerary.reduce((sum, day) => sum + day.totalCost, 0),
        is_multi_destination: tripType !== 'single',
        total_destinations: tripType === 'single' ? 1 : destinations.length,
        trip_type: tripType
      });

      // Create destinations if multi-destination trip
      if (tripType !== 'single') {
        const destinationMapping: { [clientId: string]: string } = {};
        
        for (let i = 0; i < destinations.length; i++) {
          const dest = destinations[i];
          const createdDestination = await tripService.createDestination({
            trip_id: trip.id,
            name: dest.name,
            order_index: i,
            planned_days: dest.days
          });
          
          // Map client-side ID to database UUID
          destinationMapping[dest.id] = createdDestination.id;
        }
        
        // Update itinerary with correct destination UUIDs
        itinerary.forEach(dayPlan => {
          if (dayPlan.destinationId && destinationMapping[dayPlan.destinationId]) {
            dayPlan.destinationId = destinationMapping[dayPlan.destinationId];
          }
        });
      }

      // Create day plans and activities
      for (const dayPlan of itinerary) {
        console.log(`Creating day plan for day ${dayPlan.day}: ${dayPlan.destinationName || 'Single destination'}`);
        
        const createdDayPlan = await tripService.createDayPlan({
          trip_id: trip.id,
          day_number: dayPlan.day,
          date: dayPlan.date,
          total_cost: dayPlan.totalCost,
          total_duration: dayPlan.totalDuration,
          destination_id: dayPlan.destinationId || null,
          is_travel_day: dayPlan.isTravel || false,
          travel_details: dayPlan.travelDetails || null
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

      console.log(`Trip created successfully with ${itinerary.length} days`);
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
    if (tripType === 'single') {
      return formData.from && formData.to && formData.startDate && formData.endDate && formData.interests.length > 0;
    } else {
      const hasValidDestinations = destinations.every(dest => dest.name.trim());
      return formData.from && formData.startDate && formData.endDate && formData.interests.length > 0 && hasValidDestinations;
    }
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

            {/* Trip Type Selection */}
            <div>
              <label className="block text-sm font-semibold text-white mb-3">
                Trip Type
              </label>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { value: 'single', label: 'Single Destination', icon: MapPin },
                  { value: 'multi_fixed', label: 'Multi-Destination (Fixed Days)', icon: Route },
                  { value: 'multi_flexible', label: 'Multi-Destination (AI Optimized)', icon: Plane }
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setTripType(value as any);
                      if (value === 'single') {
                        setDestinations([{ id: '1', name: '', days: 3 }]);
                      }
                    }}
                    className={`p-4 rounded-xl border transition-all duration-200 text-left ${
                      tripType === value
                        ? 'border-2 bg-slate-800 text-white'
                        : 'border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white bg-slate-800/50'
                    }`}
                    style={{
                      borderColor: tripType === value ? '#ff497c' : undefined
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="h-5 w-5" />
                      <div>
                        <div className="font-medium">{label}</div>
                        <div className="text-xs opacity-75 mt-1">{getTripTypeDescription()}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

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

              {/* Destinations Section */}
              {tripType === 'single' ? (
                /* Single Destination */
                <div>
                  <label className="block text-sm font-semibold text-white mb-3">
                    Destination
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
              ) : (
                /* Multi-Destination */
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-semibold text-white">
                      Destinations {tripType === 'multi_fixed' && `(${calculateTotalDays()} days total)`}
                    </label>
                    <button
                      type="button"
                      onClick={addDestination}
                      className="flex items-center space-x-2 px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors duration-200"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="text-sm">Add Destination</span>
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {destinations.map((destination, index) => (
                      <div key={destination.id} className="bg-slate-800/50 rounded-xl p-4 border border-slate-600">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: '#ff497c' }}>
                            {index + 1}
                          </div>
                          <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Destination city..."
                              value={destination.name}
                              onChange={(e) => handleDestinationChange(destination.id, e.target.value)}
                              onFocus={() => setShowDestinationSuggestions(destination.name.length >= 3 && filteredDestinationSuggestions.length > 0 ? destination.id : null)}
                              onBlur={() => setTimeout(() => setShowDestinationSuggestions(null), 200)}
                              className="w-full pl-10 pr-4 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:border-transparent bg-slate-700 text-white placeholder-slate-400"
                              style={{ '--tw-ring-color': '#ff497c' }}
                              required
                            />
                            
                            {/* Destination Autocomplete Suggestions */}
                            {showDestinationSuggestions === destination.id && filteredDestinationSuggestions.length > 0 && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl z-30 max-h-48 overflow-y-auto">
                                {filteredDestinationSuggestions.map((dest) => (
                                  <button
                                    key={dest}
                                    type="button"
                                    onClick={() => selectDestination(destination.id, dest)}
                                    className="w-full px-3 py-2 text-left text-white hover:bg-slate-700 transition-colors duration-200 first:rounded-t-lg last:rounded-b-lg flex items-center space-x-2"
                                  >
                                    <MapPin className="h-3 w-3 text-slate-400 flex-shrink-0" />
                                    <span className="text-sm">{dest}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          {tripType === 'multi_fixed' && (
                            <div className="flex items-center space-x-2">
                              <input
                                type="number"
                                min="1"
                                max="30"
                                value={destination.days}
                                onChange={(e) => updateDestination(destination.id, 'days', parseInt(e.target.value) || 1)}
                                className="w-16 px-2 py-2 border border-slate-600 rounded-lg bg-slate-700 text-white text-center"
                              />
                              <span className="text-sm text-slate-400">days</span>
                            </div>
                          )}
                          
                          {destinations.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeDestination(destination.id)}
                              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors duration-200"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {tripType === 'multi_flexible' && (
                    <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                      <p className="text-sm text-blue-300">
                        💡 AI will optimize the time spent at each destination based on your interests, budget, and available activities.
                      </p>
                    </div>
                  )}
                </div>
              )}
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