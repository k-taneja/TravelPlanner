/*
  # Remove Trip Sharing Feature

  This migration removes all trip sharing functionality to eliminate RLS recursion errors.
  
  1. Drop trip_shares table completely
  2. Simplify all RLS policies to owner-only access
  3. Remove all complex policy logic that could cause recursion
  4. Clean up any references to sharing in existing policies
*/

-- Drop the trip_shares table completely
DROP TABLE IF EXISTS trip_shares CASCADE;

-- Drop all existing policies that might have sharing logic
DROP POLICY IF EXISTS "trips_select_owner_and_shared" ON trips;
DROP POLICY IF EXISTS "trips_insert_owner_only" ON trips;
DROP POLICY IF EXISTS "trips_update_owner_only" ON trips;
DROP POLICY IF EXISTS "trips_delete_owner_only" ON trips;

DROP POLICY IF EXISTS "day_plans_select_accessible" ON day_plans;
DROP POLICY IF EXISTS "day_plans_insert_owner_only" ON day_plans;
DROP POLICY IF EXISTS "day_plans_update_owner_only" ON day_plans;
DROP POLICY IF EXISTS "day_plans_delete_owner_only" ON day_plans;

DROP POLICY IF EXISTS "activities_select_accessible" ON activities;
DROP POLICY IF EXISTS "activities_insert_owner_only" ON activities;
DROP POLICY IF EXISTS "activities_update_owner_only" ON activities;
DROP POLICY IF EXISTS "activities_delete_owner_only" ON activities;

-- Create simple owner-only policies for trips
CREATE POLICY "trips_owner_only_select" ON trips
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "trips_owner_only_insert" ON trips
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "trips_owner_only_update" ON trips
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "trips_owner_only_delete" ON trips
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Create simple owner-only policies for day_plans
CREATE POLICY "day_plans_owner_only_select" ON day_plans
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM trips 
    WHERE trips.id = day_plans.trip_id 
    AND trips.user_id = auth.uid()
  ));

CREATE POLICY "day_plans_owner_only_insert" ON day_plans
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM trips 
    WHERE trips.id = day_plans.trip_id 
    AND trips.user_id = auth.uid()
  ));

CREATE POLICY "day_plans_owner_only_update" ON day_plans
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM trips 
    WHERE trips.id = day_plans.trip_id 
    AND trips.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM trips 
    WHERE trips.id = day_plans.trip_id 
    AND trips.user_id = auth.uid()
  ));

CREATE POLICY "day_plans_owner_only_delete" ON day_plans
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM trips 
    WHERE trips.id = day_plans.trip_id 
    AND trips.user_id = auth.uid()
  ));

-- Create simple owner-only policies for activities
CREATE POLICY "activities_owner_only_select" ON activities
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM day_plans 
    JOIN trips ON trips.id = day_plans.trip_id
    WHERE day_plans.id = activities.day_plan_id 
    AND trips.user_id = auth.uid()
  ));

CREATE POLICY "activities_owner_only_insert" ON activities
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM day_plans 
    JOIN trips ON trips.id = day_plans.trip_id
    WHERE day_plans.id = activities.day_plan_id 
    AND trips.user_id = auth.uid()
  ));

CREATE POLICY "activities_owner_only_update" ON activities
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM day_plans 
    JOIN trips ON trips.id = day_plans.trip_id
    WHERE day_plans.id = activities.day_plan_id 
    AND trips.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM day_plans 
    JOIN trips ON trips.id = day_plans.trip_id
    WHERE day_plans.id = activities.day_plan_id 
    AND trips.user_id = auth.uid()
  ));

CREATE POLICY "activities_owner_only_delete" ON activities
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM day_plans 
    JOIN trips ON trips.id = day_plans.trip_id
    WHERE day_plans.id = activities.day_plan_id 
    AND trips.user_id = auth.uid()
  ));