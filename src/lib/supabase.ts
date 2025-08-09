import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

// Supabase configuration - these must be set as environment variables in Bolt
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug logging for environment variables (remove in production)
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Anon Key exists:', !!supabaseAnonKey);

// Validate environment variables
if (!supabaseUrl || supabaseUrl === 'your_supabase_project_url' || supabaseUrl === 'undefined') {
  throw new Error(
    'Missing or invalid VITE_SUPABASE_URL environment variable. ' +
    'Please set this in your Bolt project environment variables to your Supabase project URL (e.g., https://your-project-id.supabase.co). ' +
    'Current value: ' + supabaseUrl
  );
}

if (!supabaseAnonKey || supabaseAnonKey === 'your_supabase_anon_key' || supabaseAnonKey === 'undefined') {
  throw new Error(
    'Missing or invalid VITE_SUPABASE_ANON_KEY environment variable. ' +
    'Please set this in your Bolt project environment variables to your Supabase anon public key. ' +
    'You can find this in your Supabase project dashboard under Settings → API.'
  );
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch (error) {
  throw new Error(
    'Invalid VITE_SUPABASE_URL format. Please ensure it is a valid URL (e.g., https://your-project-id.supabase.co). ' +
    'Current value: ' + supabaseUrl
  );
}

// Create Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'X-Client-Info': 'planora-travel-app'
    }
  }
});

// Export client getter for consistency
export const getSupabaseClient = () => supabase;
export const getDirectSupabaseClient = () => supabase;