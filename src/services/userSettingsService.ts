import { supabase } from '../lib/supabase';

export interface UserSettings {
  id?: string;
  user_id: string;
  start_time: string;
  end_time: string;
  created_at?: string;
  updated_at?: string;
}

export const userSettingsService = {
  // Get user settings
  async getUserSettings(userId: string): Promise<UserSettings | null> {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No settings found, return default values
          return {
            user_id: userId,
            start_time: '09:00',
            end_time: '21:00'
          };
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching user settings:', error);
      // Return default settings on error
      return {
        user_id: userId,
        start_time: '09:00',
        end_time: '21:00'
      };
    }
  },

  // Save or update user settings
  async saveUserSettings(settings: Omit<UserSettings, 'id' | 'created_at' | 'updated_at'>): Promise<UserSettings> {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: settings.user_id,
          start_time: settings.start_time,
          end_time: settings.end_time,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving user settings:', error);
      throw new Error('Failed to save settings');
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