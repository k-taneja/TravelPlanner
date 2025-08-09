import { supabase } from '../lib/supabase';

export interface UserPreferences {
  id?: string;
  user_id: string;
  start_time: string;
  end_time: string;
  food_preferences: string;
  dietary_restrictions: string;
  travel_style: string;
  budget_preference: string;
  travel_preferences: string;
  created_at?: string;
  updated_at?: string;
}

export const userPreferencesService = {
  // Get user preferences
  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No preferences found, return default values
          return {
            user_id: userId,
            start_time: '09:00',
            end_time: '21:00',
            food_preferences: 'all',
            dietary_restrictions: '',
            travel_style: 'standard',
            accommodation_type: 'hotel',
            budget_preference: 'balanced',
          };
          travel_preferences: ''
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      // Return default preferences on error
      return {
        user_id: userId,
        start_time: '09:00',
        end_time: '21:00',
        food_preferences: 'all',
        dietary_restrictions: '',
        travel_style: 'standard',
        budget_preference: 'balanced',
        travel_preferences: ''
      };
    }
  },

  // Save or update user preferences
  async saveUserPreferences(preferences: Omit<UserPreferences, 'id' | 'created_at' | 'updated_at'>): Promise<UserPreferences> {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: preferences.user_id,
          start_time: preferences.start_time,
          end_time: preferences.end_time,
          food_preferences: preferences.food_preferences,
          dietary_restrictions: preferences.dietary_restrictions,
          travel_style: preferences.travel_style,
          budget_preference: preferences.budget_preference,
          travel_preferences: preferences.travel_preferences,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving user preferences:', error);
      throw new Error('Failed to save preferences');
    }
  },

  // Validate time settings
  validateTimeSettings(startTime: string, endTime: string): string | null {
    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);
    
    if (end <= start) {
      return 'End time must be after start time';
    }
    
    const timeDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (timeDiff < 4) {
      return 'Planning window must be at least 4 hours';
    }
    
    if (timeDiff > 18) {
      return 'Planning window cannot exceed 18 hours';
    }
    
    return null;
  },

  // Format time for display
  formatTime(time: string): string {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }
};