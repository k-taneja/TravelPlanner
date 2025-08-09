/*
  # Fix infinite recursion in trips table policies

  1. Problem
    - Current policies create circular references between trips and trip_collaborators
    - This causes infinite recursion during policy evaluation

  2. Solution
    - Simplify policies to avoid circular dependencies
    - Use direct user_id checks for basic operations
    - Create separate policies for collaboration access
    
  3. Security
    - Maintain proper access control
    - Users can only access their own trips and collaborated trips
    - Proper role-based permissions for collaborators
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view own trips and collaborated trips" ON trips;
DROP POLICY IF EXISTS "Users can update own trips and collaborated trips with edit acc" ON trips;
DROP POLICY IF EXISTS "Users can delete own trips" ON trips;
DROP POLICY IF EXISTS "Users can create own trips" ON trips;

-- Create simplified, non-recursive policies for trips table

-- Users can view their own trips
CREATE POLICY "Users can view own trips"
  ON trips
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can view trips they collaborate on
CREATE POLICY "Users can view collaborated trips"
  ON trips
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_collaborators 
      WHERE trip_collaborators.trip_id = trips.id 
      AND trip_collaborators.user_id = auth.uid() 
      AND trip_collaborators.status = 'accepted'
    )
  );

-- Users can create their own trips
CREATE POLICY "Users can create own trips"
  ON trips
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own trips
CREATE POLICY "Users can update own trips"
  ON trips
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can update trips they have editor access to
CREATE POLICY "Editors can update collaborated trips"
  ON trips
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_collaborators 
      WHERE trip_collaborators.trip_id = trips.id 
      AND trip_collaborators.user_id = auth.uid() 
      AND trip_collaborators.status = 'accepted'
      AND trip_collaborators.role IN ('owner', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_collaborators 
      WHERE trip_collaborators.trip_id = trips.id 
      AND trip_collaborators.user_id = auth.uid() 
      AND trip_collaborators.status = 'accepted'
      AND trip_collaborators.role IN ('owner', 'editor')
    )
  );

-- Users can delete their own trips
CREATE POLICY "Users can delete own trips"
  ON trips
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());