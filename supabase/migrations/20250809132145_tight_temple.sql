/*
  # Fix Trips Table RLS Policies

  This migration fixes the infinite recursion issue in the trips table RLS policies.
  The problem occurs when policies reference other tables or functions that create
  circular dependencies.

  ## Changes Made
  1. Drop all existing problematic policies on trips table
  2. Create simple, non-recursive policies for basic CRUD operations
  3. Ensure policies only reference auth.uid() directly without complex subqueries

  ## Security
  - Users can only see their own trips
  - Users can only modify their own trips
  - Collaborators can see trips they have access to (via simple join)
*/

-- Drop all existing policies on trips table to start fresh
DROP POLICY IF EXISTS "trips_select_own" ON trips;
DROP POLICY IF EXISTS "trips_select_collaborator" ON trips;
DROP POLICY IF EXISTS "trips_insert_own" ON trips;
DROP POLICY IF EXISTS "trips_update_owner" ON trips;
DROP POLICY IF EXISTS "trips_update_editor" ON trips;
DROP POLICY IF EXISTS "trips_delete_owner" ON trips;

-- Create simple, non-recursive policies
-- Policy for users to select their own trips
CREATE POLICY "trips_select_own"
  ON trips
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy for users to insert their own trips
CREATE POLICY "trips_insert_own"
  ON trips
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy for users to update their own trips
CREATE POLICY "trips_update_own"
  ON trips
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy for users to delete their own trips
CREATE POLICY "trips_delete_own"
  ON trips
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Simple policy for collaborators to view trips (without recursion)
CREATE POLICY "trips_select_collaborator"
  ON trips
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM trip_collaborators tc 
      WHERE tc.trip_id = trips.id 
        AND tc.user_id = auth.uid() 
        AND tc.status = 'accepted'
    )
  );

-- Policy for collaborators with editor role to update trips
CREATE POLICY "trips_update_collaborator"
  ON trips
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM trip_collaborators tc 
      WHERE tc.trip_id = trips.id 
        AND tc.user_id = auth.uid() 
        AND tc.status = 'accepted'
        AND tc.role IN ('owner', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM trip_collaborators tc 
      WHERE tc.trip_id = trips.id 
        AND tc.user_id = auth.uid() 
        AND tc.status = 'accepted'
        AND tc.role IN ('owner', 'editor')
    )
  );