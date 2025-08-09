/*
  # Fix infinite recursion in trips policies

  1. Problem
    - Current RLS policies on trips table are causing infinite recursion
    - Policies reference trip_collaborators which may reference back to trips
    - This creates circular dependency during policy evaluation

  2. Solution
    - Drop all existing policies on trips table
    - Create simple, non-recursive policies
    - Use direct user_id checks without complex joins
    - Handle collaboration access through application logic if needed

  3. Security
    - Users can only see their own trips (user_id = auth.uid())
    - Users can only modify their own trips
    - Collaboration features will be handled at application level
*/

-- Drop all existing policies on trips table to eliminate recursion
DROP POLICY IF EXISTS "Users can view own trips" ON trips;
DROP POLICY IF EXISTS "Users can view collaborated trips" ON trips;
DROP POLICY IF EXISTS "Users can create own trips" ON trips;
DROP POLICY IF EXISTS "Users can update own trips" ON trips;
DROP POLICY IF EXISTS "Users can delete own trips" ON trips;
DROP POLICY IF EXISTS "Editors can update collaborated trips" ON trips;

-- Create simple, non-recursive policies
CREATE POLICY "Users can view own trips"
  ON trips
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own trips"
  ON trips
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own trips"
  ON trips
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own trips"
  ON trips
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());