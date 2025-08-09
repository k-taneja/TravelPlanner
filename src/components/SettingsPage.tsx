import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, Save, AlertCircle, CheckCircle, User, Utensils, Plane, Building } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { userPreferencesService, UserPreferences } from '../services/userPreferencesService';

interface SettingsPageProps {
  onBack: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserPreferences>({
    user_id: user?.id || '',
    start_time: '09:00',
    end_time: '21:00',
    food_preferences: 'all',
    dietary_restrictions: '',
    travel_style: 'standard',
    budget_preference: 'balanced',
    travel_preferences: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load user preferences on component mount
  useEffect(() => {
    const loadSettings = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const preferences = await userPreferencesService.getUserPreferences(user.id);
        if (preferences) {
          setSettings(preferences);
        }
      } catch (err) {
        console.error('Error loading settings:', err);
        setError('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user]);

  // Track unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(true);

  const handleSave = async () => {
    if (!user) return;

    setError(null);
    setSaving(true);

    // Validate time settings
    const validation = userPreferencesService.validateTimeSettings(settings.start_time, settings.end_time);
    if (validation) {
      setError(validation);
      setSaving(false);
      return;
    }

    try {
      await userPreferencesService.saveUserPreferences({
        ...settings,
        user_id: user.id
      });
      
      setSuccess(true);
      setHasUnsavedChanges(false);
      
      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (hasUnsavedChanges) {
      const confirmLeave = window.confirm('You have unsaved changes. Are you sure you want to leave without saving?');
      if (!confirmLeave) return;
    }
    onBack();
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#ff497c' }}></div>
          <p className="text-white">Loading settings...</p>
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
            {/* Back Button and Title */}
            <div className="flex items-center space-x-3">
              <button
                onClick={handleBack}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors duration-200"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-xl font-bold text-white">Settings</h1>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving || !hasUnsavedChanges}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-semibold transition-all duration-200 ${
                saving || !hasUnsavedChanges
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-pink-600 hover:bg-pink-700 text-white hover:scale-105'
              }`}
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-500" />
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
      </nav>

      {/* Main Content */}
      <main className="pt-16 pb-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Status Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
              <span className="text-red-400">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
              <span className="text-green-400">Settings saved successfully!</span>
            </div>
          )}

          {/* Settings Form */}
          <div className="space-y-8">
            {/* Day Planning Times Section */}
            <section className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
              <div className="flex items-center mb-6">
                <Clock className="h-6 w-6 text-pink-500 mr-3" />
                <div>
                  <h2 className="text-xl font-bold text-white">Day Planning Times</h2>
                  <p className="text-slate-400 text-sm mt-1">
                    Set your preferred planning window for daily activities
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Start Time */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-3">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={settings.start_time}
                    onChange={(e) => setSettings(prev => ({ ...prev, start_time: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                  <p className="text-xs text-slate-400 mt-2">
                    Current: {formatTime(settings.start_time)}
                  </p>
                </div>

                {/* End Time */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-3">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={settings.end_time}
                    onChange={(e) => setSettings(prev => ({ ...prev, end_time: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                  <p className="text-xs text-slate-400 mt-2">
                    Current: {formatTime(settings.end_time)}
                  </p>
                </div>
              </div>

              {/* Info Box */}
              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <h3 className="text-sm font-semibold text-blue-400 mb-2">How this helps:</h3>
                <ul className="text-xs text-blue-300 space-y-1">
                  <li>• AI plans activities within your preferred hours</li>
                  <li>• Better scheduling for early birds or night owls</li>
                  <li>• Accounts for rest time and meal breaks</li>
                  <li>• Optimizes travel time between locations</li>
                </ul>
              </div>
            </section>

            {/* Food & Dining Section */}
            <section className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
              <div className="flex items-center mb-6">
                <Utensils className="h-6 w-6 text-pink-500 mr-3" />
                <div>
                  <h2 className="text-xl font-bold text-white">Food & Dining</h2>
                  <p className="text-slate-400 text-sm mt-1">
                    Customize your culinary preferences and restrictions
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Food Preferences */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-3">
                    Food Preferences
                  </label>
                  <select
                    value={settings.food_preferences}
                    onChange={(e) => setSettings(prev => ({ ...prev, food_preferences: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
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
                  <label className="block text-sm font-semibold text-white mb-3">
                    Dietary Restrictions
                  </label>
                  <input
                    type="text"
                    value={settings.dietary_restrictions}
                    onChange={(e) => setSettings(prev => ({ ...prev, dietary_restrictions: e.target.value }))}
                    placeholder="e.g., No pork, Gluten-free, Nut allergy"
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>
              </div>
            </section>

            {/* Travel Style Section */}
            <section className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
              <div className="flex items-center mb-6">
                <Plane className="h-6 w-6 text-pink-500 mr-3" />
                <div>
                  <h2 className="text-xl font-bold text-white">Travel Style</h2>
                  <p className="text-slate-400 text-sm mt-1">
                    Define your travel approach and budget preferences
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Travel Style */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-3">
                    Travel Style
                  </label>
                  <select
                    value={settings.travel_style}
                    onChange={(e) => setSettings(prev => ({ ...prev, travel_style: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
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

                {/* Travel Preferences (Natural Language) */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-white mb-3">
                    Travel Preferences (Describe in your own words)
                  </label>
                  <textarea
                    value={settings.travel_preferences || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, travel_preferences: e.target.value }))}
                    placeholder="e.g., I love exploring local markets, trying street food, visiting historical sites, and prefer walking over taxis. I enjoy authentic experiences over touristy attractions..."
                    rows={4}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
                  />
                  <p className="text-xs text-slate-400 mt-2">
                    Describe your travel style, preferences, and what makes a trip memorable for you. This helps us create more personalized itineraries.
                  </p>
                </div>

                {/* Budget Preference */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-3">
                    Budget Preference
                  </label>
                  <select
                    value={settings.budget_preference}
                    onChange={(e) => setSettings(prev => ({ ...prev, budget_preference: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  >
                    <option value="budget">Budget Conscious</option>
                    <option value="balanced">Balanced Spending</option>
                    <option value="premium">Premium Experience</option>
                    <option value="luxury">Luxury Only</option>
                  </select>
                </div>
              </div>
            </section>

          </div>

          {/* Bottom Save Button for Mobile */}
          <div className="mt-8 md:hidden">
            <button
              onClick={handleSave}
              disabled={saving || !hasUnsavedChanges}
              className={`w-full flex items-center justify-center space-x-2 px-6 py-4 rounded-xl font-semibold transition-all duration-200 ${
                saving || !hasUnsavedChanges
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-pink-600 hover:bg-pink-700 text-white'
              }`}
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-500" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};