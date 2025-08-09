import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type Trip = Database['public']['Tables']['trips']['Row'];
type TripInsert = Database['public']['Tables']['trips']['Insert'];
type DayPlan = Database['public']['Tables']['day_plans']['Row'];
type DayPlanInsert = Database['public']['Tables']['day_plans']['Insert'];
type Activity = Database['public']['Tables']['activities']['Row'];
type ActivityInsert = Database['public']['Tables']['activities']['Insert'];
type Destination = Database['public']['Tables']['destinations']['Row'];
type DestinationInsert = Database['public']['Tables']['destinations']['Insert'];
type TripSegment = Database['public']['Tables']['trip_segments']['Row'];
type TripSegmentInsert = Database['public']['Tables']['trip_segments']['Insert'];

export const tripService = {
  // Create a new trip
  async createTrip(tripData: TripInsert) {
    const { data, error } = await supabase
      .from('trips')
      .insert(tripData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Create a destination
  async createDestination(destinationData: DestinationInsert) {
    const { data, error } = await supabase
      .from('destinations')
      .insert(destinationData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Create a trip segment
  async createTripSegment(segmentData: TripSegmentInsert) {
    const { data, error } = await supabase
      .from('trip_segments')
      .insert(segmentData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Get user's trips
  async getUserTrips(userId: string) {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', userId)
      .eq('archived', false)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Get trip with day plans and activities
  async getTripWithDetails(tripId: string) {
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (tripError) throw tripError;

    // Get destinations if multi-destination trip
    let destinations = [];
    if (trip.is_multi_destination) {
      const { data: destData, error: destError } = await supabase
        .from('destinations')
        .select('*')
        .eq('trip_id', tripId)
        .order('order_index');
      
      if (destError) throw destError;
      destinations = destData || [];
    }

    const { data: dayPlans, error: dayPlansError } = await supabase
      .from('day_plans')
      .select(`
        *,
        destinations!day_plans_destination_id_fkey (
          name
        ),
        activities (*)
      `)
      .eq('trip_id', tripId)
      .order('day_number');

    if (dayPlansError) throw dayPlansError;

    return {
      ...trip,
      destinations,
      dayPlans: dayPlans.map(dayPlan => ({
        ...dayPlan,
        destination_name: dayPlan.destinations?.name || null,
        activities: dayPlan.activities.sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
      }))
    };
  },

  // Get destinations for a trip
  async getTripDestinations(tripId: string) {
    const { data, error } = await supabase
      .from('destinations')
      .select('*')
      .eq('trip_id', tripId)
      .order('order_index');
    
    if (error) throw error;
    return data;
  },

  // Update destination
  async updateDestination(destinationId: string, updates: Partial<Destination>) {
    const { data, error } = await supabase
      .from('destinations')
      .update(updates)
      .eq('id', destinationId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Create day plan
  async createDayPlan(dayPlanData: DayPlanInsert) {
    const { data, error } = await supabase
      .from('day_plans')
      .insert(dayPlanData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Create activity
  async createActivity(activityData: ActivityInsert) {
    const { data, error } = await supabase
      .from('activities')
      .insert(activityData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update trip
  async updateTrip(tripId: string, updates: Partial<Trip>) {
    const { data, error } = await supabase
      .from('trips')
      .update(updates)
      .eq('id', tripId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Delete trip
  async deleteTrip(tripId: string) {
    const { error } = await supabase
      .from('trips')
      .delete()
      .eq('id', tripId);
    
    if (error) throw error;
  },

  // Archive trip
  async archiveTrip(tripId: string) {
    const { data, error } = await supabase
      .from('trips')
      .update({ archived: true, updated_at: new Date().toISOString() })
      .eq('id', tripId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Unarchive trip
  async unarchiveTrip(tripId: string) {
    const { data, error } = await supabase
      .from('trips')
      .update({ archived: false, updated_at: new Date().toISOString() })
      .eq('id', tripId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Get archived trips
  async getArchivedTrips(userId: string) {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', userId)
      .eq('archived', true)
      .order('updated_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }
};