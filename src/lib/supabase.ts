import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

// Supabase configuration - these must be set as environment variables in Bolt
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || supabaseUrl === 'your_supabase_project_url') {
  throw new Error(
    'Missing VITE_SUPABASE_URL environment variable. ' +
    'Please set this in your Bolt project environment variables.'
  );
}

if (!supabaseAnonKey || supabaseAnonKey === 'your_supabase_anon_key') {
  throw new Error(
    'Missing VITE_SUPABASE_ANON_KEY environment variable. ' +
    'Please set this in your Bolt project environment variables.'
  );
}

// Create Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Export client getter for consistency
export const getSupabaseClient = () => supabase;
export const getDirectSupabaseClient = () => supabase;