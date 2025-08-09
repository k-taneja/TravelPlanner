import React, { useState } from 'react';
import { useEffect } from 'react';
import { Calendar, Clock, DollarSign, MapPin, HelpCircle, Edit3, Plane, User, Share2, ArrowRight, MessageCircle, Copy, Download, X, Save, RotateCcw, GripVertical, AlertTriangle, CheckCircle, Trash2, Plus } from 'lucide-react';
import { tripService } from '../services/tripService';
import { useAuth } from '../hooks/useAuth';
import { pdfService } from '../services/pdfService';
import { UserDrawer } from './UserDrawer';
import { Activity } from '../types';

interface ItineraryViewProps {
  tripId?: string;
  onEditTrip: () => void;
  onShowMap: () => void;
  onBack: () => void;
  onLogout: () => void;
}

export const ItineraryView: React.FC<ItineraryViewProps> = ({ tripId, onEditTrip, onShowMap, onBack, onLogout }) => {
  const { user } = useAuth();
  const [selectedDay, setSelectedDay] = useState(1);
  const [showWhyThis, setShowWhyThis] = useState<string | null>(null);
  const [showSharePopup, setShowSharePopup] = useState(false);
  const [showLogoutDrawer, setShowLogoutDrawer] = useState(false);
  const [showUserDrawer, setShowUserDrawer] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedActivities, setEditedActivities] = useState<any[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [showRegenerateButton, setShowRegenerateButton] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [tripData, setTripData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [newActivity, setNewActivity] = useState({
    time: '09:00',
    name: '',
    type: 'attraction',
    description: '',
    duration: 60,
    cost: 0,
    location_address: ''
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  // Smart activity suggestions based on type
  const getActivitySuggestions = (type: string): string[] => {
    const suggestions = {
      experience: [
        "Museum visits, art galleries, historical sites",
        "Tours, sightseeing, local attractions", 
        "Entertainment, shows, concerts, events",
        "Adventure activities, sports, recreation"
      ],
      food: [
        "Breakfast, lunch, dinner at restaurants",
        "Coffee breaks, snacks, street food",
        "Food tours, cooking classes, wine tasting",
        "Grocery shopping, meal preparation"
      ],
      travel: [
        "Flight check-in, boarding, travel time",
        "Train, bus, taxi, rideshare journeys",
        "Airport transfers, commute time",
        "Car rental pickup, driving between cities"
      ],
      social: [
        "Meeting friends, family gatherings",
        "Personal time, relaxation, spa visits",
        "Phone calls, video chats with loved ones",
        "Alone time, journaling, meditation"
      ],
      shopping: [
        "Local markets, souvenir shopping",
        "Grocery stores, pharmacies, essentials",
        "Appointments (doctor, salon, services)",
        "Banking, post office, administrative tasks"
      ],
      other: [
        "Buffer time, flexible scheduling",
        "Work calls, business meetings",
        "Unexpected discoveries, spontaneous activities",
        "Rest time, travel delays, contingency"
      ]
    };
    
    return suggestions[type as keyof typeof suggestions] || [];
  };

  // Load trip data from database
  useEffect(() => {
    const loadTripData = async () => {
      if (!tripId || !user) {
        // Use mock data for demo/guest users
        const mockTripData = {
          id: 'mock-trip',
          destination: 'Paris, France',
          start_date: '2025-03-15',
          end_date: '2025-03-18',
          budget: 100000,
          pace: 'balanced',
          interests: ['history', 'food', 'art'],
          total_cost: 7636,
          dayPlans: [
            {
              day_number: 1,
              date: '2025-03-15',
              total_cost: 7636,
              total_duration: 390,
              activities: [
                {
                  id: '1',
                  time: '09:00',
                  name: 'Eiffel Tower Visit',
                  type: 'attraction',
                  description: 'Iconic iron tower with city views',
                  duration: 120,
                  cost: 2075,
                  location_lat: 48.8584,
                  location_lng: 2.2945,
                  location_address: 'Champ de Mars, 5 Avenue Anatole France, 75007 Paris',
                  why_this: 'Most iconic landmark in Paris, best views in the morning with fewer crowds'
                },
                {
                  id: '2',
                  time: '12:30',
                  name: 'Café de Flore Lunch',
                  type: 'food',
                  description: 'Historic café with French cuisine',
                  duration: 90,
                  cost: 2905,
                  location_lat: 48.8542,
                  location_lng: 2.3320,
                  location_address: '172 Boulevard Saint-Germain, 75006 Paris',
                  why_this: 'Famous literary café, perfect for experiencing Parisian culture'
                },
                {
                  id: '3',
                  time: '15:00',
                  name: 'Louvre Museum',
                  type: 'attraction',
                  description: 'World\'s largest art museum',
                  duration: 180,
                  cost: 1411,
                  location_lat: 48.8606,
                  location_lng: 2.3376,
                  location_address: 'Rue de Rivoli, 75001 Paris',
                  why_this: 'Must-see art collection including Mona Lisa, afternoon has shorter lines'
                }
              ]
            }
          ]
        };
        setTripData(mockTripData);
        setLoading(false);
        return;
      }

      try {
        const trip = await tripService.getTripWithDetails(tripId);
        setTripData(trip);
      } catch (err) {
        console.error('Error loading trip:', err);
        setError('Failed to load trip details');
      } finally {
        setLoading(false);
      }
    };

    loadTripData();
  }, [tripId, user]);

  const currentDay = tripData?.dayPlans?.find((day: any) => day.day_number === selectedDay);

  // Initialize edited activities when entering edit mode
  useEffect(() => {
    if (isEditMode && currentDay?.activities) {
      setEditedActivities([...currentDay.activities]);
    }
  }, [isEditMode, currentDay]);

  // Check for changes
  useEffect(() => {
    if (isEditMode && currentDay?.activities && editedActivities.length > 0) {
      const hasModifications = JSON.stringify(currentDay.activities) !== JSON.stringify(editedActivities);
      setHasChanges(hasModifications);
      setShowRegenerateButton(hasModifications);
    }
  }, [editedActivities, currentDay, isEditMode]);

  const getActivityIcon = (type: Activity['type']) => {
    const icons = {
      attraction: '🏛️',
      food: '🍽️',
      transport: '🚗',
      shopping: '🛍️',
      nature: '🌿',
      history: '🏛️'
    };
    return icons[type] || '📍';
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://planora.app/trip/shared-${tripData?.id || 'demo'}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareToWhatsApp = () => {
    const message = `Check out my ${tripData?.destination} itinerary! 🏛️\n\n${tripData?.dayPlans?.length || 0} days of amazing activities planned by AI.\n\nView full itinerary: https://planora.app/trip/shared-${tripData?.id || 'demo'}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    setShowSharePopup(false);
  };

  const downloadPDF = () => {
    handleDownloadPDF();
    setShowSharePopup(false);
  };

  const handleEditToggle = () => {
    if (isEditMode && hasChanges) {
      const confirmDiscard = window.confirm('You have unsaved changes. Are you sure you want to discard them?');
      if (!confirmDiscard) return;
    }
    
    setIsEditMode(!isEditMode);
    setHasChanges(false);
    setShowRegenerateButton(false);
    setValidationErrors([]);
    
    if (!isEditMode && currentDay?.activities) {
      setEditedActivities([...currentDay.activities]);
    }
  };

  const handleActivityChange = (activityId: string, field: string, value: any) => {
    setEditedActivities(prev => 
      prev.map(activity => 
        activity.id === activityId 
          ? { ...activity, [field]: value }
          : activity
      )
    );
  };

  const handleDragStart = (e: React.DragEvent, activityId: string) => {
    setDraggedItem(activityId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    
    if (!draggedItem || draggedItem === targetId) return;
    
    const draggedIndex = editedActivities.findIndex(a => a.id === draggedItem);
    const targetIndex = editedActivities.findIndex(a => a.id === targetId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    const newActivities = [...editedActivities];
    const [draggedActivity] = newActivities.splice(draggedIndex, 1);
    newActivities.splice(targetIndex, 0, draggedActivity);
    
    setEditedActivities(newActivities);
    setDraggedItem(null);
  };

  const handleDeleteActivity = (activityId: string) => {
    setShowDeleteConfirm(activityId);
  };

  const confirmDeleteActivity = (activityId: string) => {
    setEditedActivities(prev => prev.filter(activity => activity.id !== activityId));
    setShowDeleteConfirm(null);
  };

  const handleAddActivity = () => {
    if (!newActivity.name.trim()) {
      alert('Please enter an activity name');
      return;
    }

    const activity = {
      id: `new-${Date.now()}`,
      time: newActivity.time,
      name: newActivity.name,
      type: newActivity.type,
      description: newActivity.description,
      duration: newActivity.duration,
      cost: newActivity.cost,
      location_lat: 28.6139 + Math.random() * 0.1, // Mock coordinates
      location_lng: 77.2090 + Math.random() * 0.1,
      location_address: newActivity.location_address || `${newActivity.name} Location`,
      why_this: `Added by user for personalized experience`,
      order_index: editedActivities.length
    };

    setEditedActivities(prev => [...prev, activity]);
    
    // Reset form
    setNewActivity({
      time: '09:00',
      name: '',
      type: 'attraction',
      description: '',
      duration: 60,
      cost: 0,
      location_address: ''
    });
    setShowAddActivity(false);
  };

  const handleSaveChanges = async () => {
    const errors = validateChanges();
    setValidationErrors(errors);
    
    if (errors.length > 0) {
      return;
    }

    setSaveLoading(true);
    
    try {
      // Update the trip data with edited activities
      const updatedDayPlans = tripData.dayPlans.map((day: any) => 
        day.day_number === selectedDay 
          ? { 
              ...day, 
              activities: editedActivities,
              total_cost: editedActivities.reduce((sum, act) => sum + (act.cost || 0), 0),
              total_duration: editedActivities.reduce((sum, act) => sum + (act.duration || 0), 0)
            }
          : day
      );

      setTripData(prev => ({
        ...prev,
        dayPlans: updatedDayPlans
      }));

      // In a real app, you would save to database here
      // await tripService.updateDayPlan(currentDay.id, { activities: editedActivities });
      
      setIsEditMode(false);
      setHasChanges(false);
      setShowRegenerateButton(false);
      setValidationErrors([]);
      
      // Show success feedback
      console.log('Changes saved successfully');
      
    } catch (error) {
      console.error('Error saving changes:', error);
      setValidationErrors(['Failed to save changes. Please try again.']);
    } finally {
      setSaveLoading(false);
    }
  };
  const validateChanges = () => {
    const errors: string[] = [];
    
    // Check for time conflicts
    const sortedActivities = [...editedActivities].sort((a, b) => a.time.localeCompare(b.time));
    
    for (let i = 0; i < sortedActivities.length - 1; i++) {
      const current = sortedActivities[i];
      const next = sortedActivities[i + 1];
      
      const currentEnd = new Date(`2000-01-01T${current.time}`);
      currentEnd.setMinutes(currentEnd.getMinutes() + (current.duration || 0));
      
      const nextStart = new Date(`2000-01-01T${next.time}`);
      
      if (currentEnd > nextStart) {
        errors.push(`Time conflict: "${current.name}" overlaps with "${next.name}"`);
      }
    }
    
    // Check for missing required fields
    editedActivities.forEach((activity, index) => {
      if (!activity.name?.trim()) {
        errors.push(`Activity ${index + 1}: Name is required`);
      }
      if (!activity.time) {
        errors.push(`Activity ${index + 1}: Time is required`);
      }
    });
    
    // Check for unrealistic durations
    editedActivities.forEach((activity) => {
      if (activity.duration && (activity.duration < 15 || activity.duration > 480)) {
        errors.push(`"${activity.name}": Duration should be between 15 minutes and 8 hours`);
      }
    });
    
    return errors;
  };

  const generateRegeneratePrompt = () => {
    const activities = editedActivities.map(activity => ({
      time: activity.time,
      name: activity.name,
      type: activity.type,
      description: activity.description,
      duration: activity.duration,
      cost: activity.cost,
      location_address: activity.location_address,
      why_this: activity.why_this
    }));

    return {
      destination: tripData.destination,
      date: currentDay.date,
      dayNumber: selectedDay,
      currentActivities: activities,
      budget: tripData.budget,
      pace: tripData.pace,
      interests: tripData.interests,
      userChanges: {
        modified: true,
        instruction: "User has modified the itinerary. Please regenerate optimized timings, validate activity sequences, ensure realistic travel times between locations, and adjust costs if needed. Maintain user's activity selections but optimize the schedule."
      }
    };
  };

  const handleRegenerate = async () => {
    const errors = validateChanges();
    setValidationErrors(errors);
    
    if (errors.length > 0) {
      return;
    }
    
    setRegenerating(true);
    
    try {
      // Generate prompt with current activities and user changes
      const regenerateData = generateRegeneratePrompt();
      
      // Call the regeneration service (this would call your Edge Function)
      console.log('Regenerating with data:', regenerateData);
      
      // For now, simulate the API call with intelligent timing adjustments
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate intelligent timing optimization
      const optimizedActivities = editedActivities.map((activity, index) => {
        // Auto-adjust timings based on duration and travel time
        let newTime = activity.time;
        if (index > 0) {
          const prevActivity = editedActivities[index - 1];
          const prevEndTime = new Date(`2000-01-01T${prevActivity.time}`);
          prevEndTime.setMinutes(prevEndTime.getMinutes() + (prevActivity.duration || 60) + 30); // Add 30min travel buffer
          
          const hours = prevEndTime.getHours().toString().padStart(2, '0');
          const minutes = prevEndTime.getMinutes().toString().padStart(2, '0');
          newTime = `${hours}:${minutes}`;
        }
        
        return {
          ...activity,
          time: newTime
        };
      });
      
      // Update with optimized timings
      setEditedActivities(optimizedActivities);
      
      // Update the trip data with edited activities
      setTripData(prev => ({
        ...prev,
        dayPlans: prev.dayPlans.map((day: any) => 
          day.day_number === selectedDay 
            ? { 
                ...day, 
                activities: optimizedActivities,
                total_cost: optimizedActivities.reduce((sum, act) => sum + (act.cost || 0), 0),
                total_duration: optimizedActivities.reduce((sum, act) => sum + (act.duration || 0), 0)
              }
            : day
        )
      }));
      
      setIsEditMode(false);
      setHasChanges(false);
      setShowRegenerateButton(false);
      setValidationErrors([]);
      
    } catch (error) {
      console.error('Error regenerating itinerary:', error);
      setValidationErrors(['Failed to regenerate itinerary. Please try again.']);
    } finally {
      setRegenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!tripData) return;

    setPdfLoading(true);
    try {
      console.log('Downloading PDF for trip data:', tripData);
      
      // Ensure we have the correct data structure
      const pdfData = {
        id: tripData.id,
        destination: tripData.destination,
        start_date: tripData.start_date,
        end_date: tripData.end_date,
        budget: tripData.budget || 100000,
        totalCost: tripData.total_cost || 0,
        pace: tripData.pace || 'balanced',
        interests: tripData.interests || [],
        dayPlans: tripData.dayPlans || []
      };
      
      await pdfService.generateTripPDF(tripData);
      console.log('PDF generation completed successfully');
    } catch (error) {
      console.error('PDF generation failed:', error);
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate PDF. Please try again.';
      alert(errorMessage);
    } finally {
      setPdfLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${(amount * 83).toLocaleString('en-IN')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#ff497c' }}></div>
          <p className="text-white">Loading your itinerary...</p>
        </div>
      </div>
    );
  }

  if (error || !tripData) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 max-w-md">
            <p className="text-red-400 mb-4">{error || 'Trip not found'}</p>
            <button
              onClick={onBack}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Fixed Top Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <button
              onClick={onBack}
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity duration-200"
            >
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#ff497c' }}>
                <Plane className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Planora</span>
            </button>

            {/* Right Icons */}
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setShowUserDrawer(true)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors duration-200"
              >
                <User className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Trip Header Card */}
      <div className="pt-20 px-6 py-6">
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl p-6 shadow-xl border border-slate-600">
          <div className="flex items-start justify-between">
            {/* Trip Details */}
            <div className="flex-1">
              {/* Route */}
              <div className="flex items-center space-x-3 mb-4">
                <div className="text-lg font-semibold text-white">Delhi</div>
                <ArrowRight className="h-5 w-5 text-slate-400" />
                <div className="text-lg font-semibold text-white">{tripData.destination}</div>
              </div>
              
              {/* Trip Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Dates</div>
                  <div className="text-sm text-white font-medium">
                    {formatDate(tripData.start_date)} - {formatDate(tripData.end_date)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Budget</div>
                  <div className="text-sm text-white font-medium">
                    {formatCurrency(tripData.budget || 1500)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Total Cost</div>
                  <div className="text-sm font-medium" style={{ color: '#ff497c' }}>
                    ₹{(tripData.total_cost * 83).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Icons */}
            <div className="flex items-center space-x-3 ml-6">
              <button
                onClick={isEditMode ? handleSaveChanges : handleEditToggle}
                disabled={isEditMode && saveLoading}
                className={`p-3 rounded-xl transition-all duration-200 hover:scale-105 border ${
                  isEditMode 
                    ? saveLoading
                      ? 'bg-gray-600 cursor-not-allowed text-gray-400 border-gray-500'
                      : 'bg-green-600 hover:bg-green-700 text-white border-green-500'
                    : 'bg-slate-700 hover:bg-slate-600 text-white border-slate-600 hover:border-slate-500'
                }`}
                title={isEditMode ? "Save Changes" : "Edit Itinerary"}
              >
                {isEditMode ? (
                  saveLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400"></div>
                  ) : (
                    <Save className="h-5 w-5" />
                  )
                ) : (
                  <Edit3 className="h-5 w-5" />
                )}
              </button>
              <button
                onClick={onShowMap}
                className="p-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-all duration-200 hover:scale-105 border border-slate-600 hover:border-slate-500"
                title="View on Map"
              >
                <MapPin className="h-5 w-5" />
              </button>
              <button
                onClick={() => setShowSharePopup(true)}
                className="p-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-all duration-200 hover:scale-105 border border-slate-600 hover:border-slate-500"
                title="Share Trip"
              >
                <Share2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Day Selector */}
        <div className="mt-6">
          <div className="flex space-x-2 overflow-x-auto">
            {tripData.dayPlans?.map((day: any) => (
              <button
                key={day.day_number}
                onClick={() => setSelectedDay(day.day_number)}
                className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all duration-200 font-medium ${
                  selectedDay === day.day_number
                    ? 'text-white shadow-sm border-2'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600'
                }`}
                style={selectedDay === day.day_number ? { backgroundColor: '#ff497c', borderColor: '#ff497c' } : {}}
              >
                Day {day.day_number}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Activities */}
      {currentDay && (
        <div className="px-6 py-6 space-y-4">
          {/* Edit Mode Header */}
          {isEditMode && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
              <div className="flex items-center space-x-2 mb-2">
                <Edit3 className="h-5 w-5 text-blue-400" />
                <h3 className="font-semibold text-blue-400">Edit Mode Active</h3>
              </div>
              <p className="text-sm text-blue-300">
                You can now modify activity details and drag items to reorder them. Changes will be validated when you regenerate.
              </p>
            </div>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
              <div className="flex items-center space-x-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <h3 className="font-semibold text-red-400">Validation Issues</h3>
              </div>
              <ul className="space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="text-sm text-red-300 flex items-start space-x-2">
                    <span className="text-red-400 mt-0.5">•</span>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">
                {new Date(currentDay.date).toLocaleDateString('en-US', { 
                  weekday: 'long',
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h2>
              <div className="flex items-center space-x-4 text-sm text-slate-300 mt-1">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {Math.floor((currentDay.total_duration || 0) / 60)}h {(currentDay.total_duration || 0) % 60}m
                </div>
                <div className="flex items-center">
                  <DollarSign className="h-4 w-4 mr-1" />
                  ₹{(currentDay.total_cost || 0).toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>

          {(isEditMode ? editedActivities : currentDay.activities)?.map((activity: any, index: number) => (
            <div key={activity.id} className="relative">
              {/* Timeline connector */}
              {index < ((isEditMode ? editedActivities : currentDay.activities)?.length || 0) - 1 && (
                <div className="absolute left-6 top-16 w-0.5 h-8 bg-slate-600" />
              )}
              
              <div 
                className={`bg-slate-800 rounded-xl p-6 shadow-sm border transition-all duration-200 ${
                  isEditMode 
                    ? 'border-slate-600 hover:border-slate-500 cursor-move' 
                    : 'border-slate-700 hover:shadow-md'
                } ${draggedItem === activity.id ? 'opacity-50' : ''}`}
                draggable={isEditMode}
                onDragStart={(e) => handleDragStart(e, activity.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, activity.id)}
              >
                <div className="flex items-start space-x-4">
                  {/* Drag Handle */}
                  {isEditMode && (
                    <div className="flex-shrink-0 pt-1">
                      <GripVertical className="h-5 w-5 text-slate-400 cursor-move" />
                    </div>
                  )}

                  {/* Time & Icon */}
                  <div className="flex-shrink-0 text-center">
                    {isEditMode ? (
                      <input
                        type="time"
                        value={activity.time}
                        onChange={(e) => handleActivityChange(activity.id, 'time', e.target.value)}
                        className="text-sm font-semibold mb-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white w-20"
                      />
                    ) : (
                      <div className="text-sm font-semibold mb-1" style={{ color: '#ff497c' }}>
                        {formatTime(activity.time)}
                      </div>
                    )}
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg border-2" style={{ backgroundColor: '#ff497c20', borderColor: '#ff497c' }}>
                      {getActivityIcon(activity.type)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      {isEditMode ? (
                        <input
                          type="text"
                          value={activity.name}
                          onChange={(e) => handleActivityChange(activity.id, 'name', e.target.value)}
                          className="font-semibold text-white bg-slate-700 border border-slate-600 rounded px-3 py-1 flex-1 mr-4"
                          placeholder="Activity name"
                        />
                      ) : (
                        <h3 className="font-semibold text-white">{activity.name}</h3>
                      )}
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => setShowWhyThis(showWhyThis === activity.id ? null : activity.id)}
                          className="p-1.5 text-slate-400 transition-colors duration-200 rounded-lg hover:bg-slate-700"
                          style={{ '--hover-color': '#ff497c' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#ff497c'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                        >
                          <HelpCircle className="h-4 w-4" />
                        </button>
                        {isEditMode && (
                          <button
                            onClick={() => handleDeleteActivity(activity.id)}
                            className="p-1.5 text-red-400 hover:text-red-300 transition-colors duration-200 rounded-lg hover:bg-red-500/10"
                            title="Delete Activity"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                        {!isEditMode && (
                          <button 
                            onClick={handleEditToggle}
                            className="p-1.5 text-slate-400 hover:text-slate-300 transition-colors duration-200 rounded-lg hover:bg-slate-700"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {isEditMode ? (
                      <textarea
                        value={activity.description}
                        onChange={(e) => handleActivityChange(activity.id, 'description', e.target.value)}
                        className="text-slate-300 mb-3 bg-slate-700 border border-slate-600 rounded px-3 py-2 w-full resize-none"
                        rows={2}
                        placeholder="Activity description"
                      />
                    ) : (
                      <p className="text-slate-300 mb-3">{activity.description}</p>
                    )}
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-4 text-slate-400">
                        {isEditMode ? (
                          <>
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              <input
                                type="number"
                                value={activity.duration || ''}
                                onChange={(e) => handleActivityChange(activity.id, 'duration', parseInt(e.target.value) || 0)}
                                className="bg-slate-700 border border-slate-600 rounded px-2 py-1 w-16 text-white"
                                placeholder="60"
                                min="15"
                                max="480"
                              />
                              <span className="ml-1">min</span>
                            </div>
                            <div className="flex items-center">
                              <span className="text-xs mr-1">₹</span>
                              <input
                                type="number"
                                value={activity.cost || ''}
                                onChange={(e) => handleActivityChange(activity.id, 'cost', parseInt(e.target.value) || 0)}
                                className="bg-slate-700 border border-slate-600 rounded px-2 py-1 w-20 text-white"
                                placeholder="0"
                                min="0"
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {activity.duration}min
                            </div>
                            <div className="flex items-center">
                              <span className="text-xs mr-1">₹</span>
                              {activity.cost?.toLocaleString('en-IN') || '0'}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Why This Explanation */}
                    {showWhyThis === activity.id && (
                      <div className="mt-4 p-4 rounded-lg border-l-4" style={{ backgroundColor: '#ff497c20', borderColor: '#ff497c' }}>
                        <p className="text-sm text-slate-200">
                          <span className="font-semibold">Why this? </span>
                          {activity.why_this}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Add Activity Button */}
          {isEditMode && (
            <div className="mt-6">
              {!showAddActivity ? (
                <button
                  onClick={() => setShowAddActivity(true)}
                  className="w-full p-4 border-2 border-dashed border-slate-600 rounded-xl text-slate-400 hover:text-white hover:border-slate-500 transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  <Plus className="h-5 w-5" />
                  <span className="font-medium">Add Custom Activity</span>
                </button>
              ) : (
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-600">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Add New Activity</h3>
                    <button
                      onClick={() => setShowAddActivity(false)}
                      className="p-1 text-slate-400 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Activity Name */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-white mb-2">
                        Activity Name *
                      </label>
                      <input
                        type="text"
                        value={newActivity.name}
                        onChange={(e) => setNewActivity(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter activity name"
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                      />
                    </div>

                    {/* Time */}
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Time
                      </label>
                      <input
                        type="time"
                        value={newActivity.time}
                        onChange={(e) => setNewActivity(prev => ({ ...prev, time: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                      />
                    </div>

                    {/* Type */}
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Type
                      </label>
                      <select
                        value={newActivity.type}
                        onChange={(e) => setNewActivity(prev => ({ ...prev, type: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                      >
                        <option value="attraction">Attraction</option>
                        <option value="food">Food</option>
                        <option value="history">History</option>
                        <option value="nature">Nature</option>
                        <option value="shopping">Shopping</option>
                        <option value="transport">Transport</option>
                      </select>
                    </div>

                    {/* Duration */}
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Duration (minutes)
                      </label>
                      <input
                        type="number"
                        value={newActivity.duration}
                        onChange={(e) => setNewActivity(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                        min="15"
                        max="480"
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                      />
                    </div>

                    {/* Cost */}
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Cost (₹)
                      </label>
                      <input
                        type="number"
                        value={newActivity.cost}
                        onChange={(e) => setNewActivity(prev => ({ ...prev, cost: parseInt(e.target.value) || 0 }))}
                        min="0"
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                      />
                    </div>

                    {/* Description */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-white mb-2">
                        Description
                      </label>
                      <textarea
                        value={newActivity.description}
                        onChange={(e) => setNewActivity(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe the activity"
                        rows={2}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                      />
                    </div>

                    {/* Location */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-white mb-2">
                        Location/Address
                      </label>
                      <input
                        type="text"
                        value={newActivity.location_address}
                        onChange={(e) => setNewActivity(prev => ({ ...prev, location_address: e.target.value }))}
                        placeholder="Enter location or address"
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                      />
                    </div>
                  </div>

                  <div className="flex space-x-3 mt-6">
                    <button
                      onClick={() => setShowAddActivity(false)}
                      className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddActivity}
                      className="flex-1 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Activity</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Edit Mode Actions */}
      {isEditMode && (
        <div className="px-6 py-6 bg-slate-800 border-t border-slate-700">
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Regenerate Button */}
            {showRegenerateButton && (
              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                className={`w-full p-4 rounded-xl font-bold text-lg transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg ${
                  regenerating
                    ? 'bg-slate-600 cursor-not-allowed text-slate-400'
                    : 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white hover:scale-[0.98] active:scale-[0.96]'
                }`}
              >
                {regenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-400"></div>
                    <span>Validating & Regenerating...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-6 w-6" />
                    <span>Optimize & Regenerate</span>
                  </>
                )}
              </button>
            )}
            
            {hasChanges && !regenerating && showRegenerateButton && (
              <p className="text-center text-slate-400 text-sm">
                AI will optimize timings and validate your changes
              </p>
            )}

            {/* Save and Cancel Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  if (hasChanges) {
                    const confirmDiscard = window.confirm('You have unsaved changes. Are you sure you want to discard them?');
                    if (!confirmDiscard) return;
                  }
                  setIsEditMode(false);
                  setHasChanges(false);
                  setShowRegenerateButton(false);
                  setValidationErrors([]);
                }}
                className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveChanges}
                disabled={saveLoading}
                className={`flex-1 px-6 py-3 rounded-xl transition-colors duration-200 font-medium flex items-center justify-center space-x-2 ${
                  saveLoading
                    ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {saveLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div 
            className="bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl border border-slate-600"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mr-4 border border-red-500/30">
                  <Trash2 className="h-6 w-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Delete Activity</h3>
                  <p className="text-sm text-slate-400">This action cannot be undone</p>
                </div>
              </div>
              
              <p className="text-slate-300 mb-6">
                Are you sure you want to delete this activity from your itinerary?
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors duration-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => confirmDeleteActivity(showDeleteConfirm)}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors duration-200 font-medium flex items-center justify-center space-x-2"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Share Popup */}
      {showSharePopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm border border-slate-600 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Share Your Trip</h3>
              <button
                onClick={() => setShowSharePopup(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors duration-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              {/* WhatsApp Share */}
              <button
                onClick={shareToWhatsApp}
                className="w-full p-4 bg-green-600 hover:bg-green-700 text-white rounded-xl flex items-center justify-center space-x-3 transition-all duration-200 hover:scale-[0.98]"
              >
                <MessageCircle className="h-5 w-5" />
                <span className="font-semibold">Share on WhatsApp</span>
              </button>
              
              {/* Copy Link */}
              <button
                onClick={handleCopyLink}
                className={`w-full p-4 rounded-xl flex items-center justify-center space-x-3 transition-all duration-200 hover:scale-[0.98] ${
                  copied 
                    ? 'bg-green-600 text-white' 
                    : 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600'
                }`}
              >
                {copied ? (
                  <>
                    <Copy className="h-5 w-5" />
                    <span className="font-semibold">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-5 w-5" />
                    <span className="font-semibold">Copy Link</span>
                  </>
                )}
              </button>
              
              {/* Download PDF */}
              <button
                onClick={downloadPDF}
                disabled={pdfLoading}
                className={`w-full p-4 rounded-xl flex items-center justify-center space-x-3 transition-all duration-200 hover:scale-[0.98] border border-slate-600 ${
                  pdfLoading 
                    ? 'bg-slate-600 cursor-not-allowed' 
                    : 'bg-slate-700 hover:bg-slate-600'
                } text-white`}
              >
                {pdfLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span className="font-semibold">Generating PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5" />
                    <span className="font-semibold">Download PDF</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Drawer */}
      <UserDrawer 
        isOpen={showUserDrawer}
        onClose={() => setShowUserDrawer(false)}
        onSignOut={() => {
          setShowUserDrawer(false);
          onBack(); // Navigate to login screen
        }}
        onSettings={() => {
          setShowUserDrawer(false);
          // For now, settings will open in modal from UserDrawer
          // In future, this could navigate to settings page
        }}
      />
    </div>
  );
};