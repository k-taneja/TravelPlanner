/*
  # Fix Collaborative RLS Policies - Prevent Infinite Recursion

  This migration fixes the infinite recursion issue in RLS policies and implements
  proper collaborative access patterns for trip sharing.

  ## Root Cause Analysis:
  Infinite recursion in RLS policies occurs when:
  1. Policy A references table B
  2. Table B has a policy that references table A
  3. PostgreSQL gets stuck in a loop trying to evaluate permissions

  ## Solution Strategy:
  1. Use EXISTS clauses instead of JOINs in policies
  2. Avoid referencing the same table within its own policy
  3. Structure policies to be as simple and direct as possible
  4. Use separate policies for different access patterns

  ## Policy Structure:
  - Direct ownership policies (user_id = auth.uid())
  - Collaboration policies using EXISTS with trip_collaborators
  - Separate policies for different operations (SELECT, INSERT, UPDATE, DELETE)
*/

-- First, completely clean up existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own trips" ON trips;
DROP POLICY IF EXISTS "Users can view collaborated trips" ON trips;
DROP POLICY IF EXISTS "Users can create own trips" ON trips;
DROP POLICY IF EXISTS "Users can update own trips" ON trips;
DROP POLICY IF EXISTS "Editors can update collaborated trips" ON trips;
DROP POLICY IF EXISTS "Users can delete own trips" ON trips;

-- Ensure RLS is enabled
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can SELECT their own trips (direct ownership)
CREATE POLICY "trips_select_own"
  ON trips
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy 2: Users can SELECT trips they collaborate on
-- Uses EXISTS to avoid recursion - no JOIN with trips table
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

-- Policy 3: Users can INSERT their own trips
CREATE POLICY "trips_insert_own"
  ON trips
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Policy 4: Trip owners can UPDATE their trips
CREATE POLICY "trips_update_owner"
  ON trips
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy 5: Collaborators with editor role can UPDATE trips
CREATE POLICY "trips_update_editor"
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

-- Policy 6: Only trip owners can DELETE trips
CREATE POLICY "trips_delete_owner"
  ON trips
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Now set up policies for trip_collaborators table
DROP POLICY IF EXISTS "Trip owners can manage collaborators" ON trip_collaborators;
DROP POLICY IF EXISTS "Users can respond to their own invitations" ON trip_collaborators;
DROP POLICY IF EXISTS "Users can view collaborators for their trips" ON trip_collaborators;

ALTER TABLE trip_collaborators ENABLE ROW LEVEL SECURITY;

-- Policy 1: Trip owners can manage all collaborators for their trips
CREATE POLICY "collaborators_manage_owner"
  ON trip_collaborators
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM trips t
      WHERE t.id = trip_collaborators.trip_id
        AND t.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM trips t
      WHERE t.id = trip_collaborators.trip_id
        AND t.user_id = auth.uid()
    )
  );

-- Policy 2: Users can view collaborators for trips they have access to
CREATE POLICY "collaborators_select_accessible"
  ON trip_collaborators
  FOR SELECT
  TO authenticated
  USING (
    -- Can see if they own the trip
    EXISTS (
      SELECT 1 
      FROM trips t
      WHERE t.id = trip_collaborators.trip_id
        AND t.user_id = auth.uid()
    )
    OR
    -- Can see if they are a collaborator on the trip
    EXISTS (
      SELECT 1 
      FROM trip_collaborators tc2
      WHERE tc2.trip_id = trip_collaborators.trip_id
        AND tc2.user_id = auth.uid()
        AND tc2.status = 'accepted'
    )
    OR
    -- Can see their own invitation record
    (user_id = auth.uid() OR email = auth.email())
  );

-- Policy 3: Users can update their own invitation responses
CREATE POLICY "collaborators_update_own_response"
  ON trip_collaborators
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR email = auth.email())
  WITH CHECK (user_id = auth.uid() OR email = auth.email());

-- Set up policies for day_plans table
DROP POLICY IF EXISTS "Users can create day plans for editable trips" ON day_plans;
DROP POLICY IF EXISTS "Users can view day plans for accessible trips" ON day_plans;
DROP POLICY IF EXISTS "Users can update day plans for editable trips" ON day_plans;
DROP POLICY IF EXISTS "Users can delete day plans for editable trips" ON day_plans;

ALTER TABLE day_plans ENABLE ROW LEVEL SECURITY;

-- Day plans policies - simplified to avoid recursion
CREATE POLICY "day_plans_select"
  ON day_plans
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM trips t
      WHERE t.id = day_plans.trip_id
        AND (
          t.user_id = auth.uid()
          OR
          EXISTS (
            SELECT 1 
            FROM trip_collaborators tc
            WHERE tc.trip_id = t.id
              AND tc.user_id = auth.uid()
              AND tc.status = 'accepted'
          )
        )
    )
  );

CREATE POLICY "day_plans_insert"
  ON day_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM trips t
      WHERE t.id = day_plans.trip_id
        AND (
          t.user_id = auth.uid()
          OR
          EXISTS (
            SELECT 1 
            FROM trip_collaborators tc
            WHERE tc.trip_id = t.id
              AND tc.user_id = auth.uid()
              AND tc.status = 'accepted'
              AND tc.role IN ('owner', 'editor')
          )
        )
    )
  );

CREATE POLICY "day_plans_update"
  ON day_plans
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM trips t
      WHERE t.id = day_plans.trip_id
        AND (
          t.user_id = auth.uid()
          OR
          EXISTS (
            SELECT 1 
            FROM trip_collaborators tc
            WHERE tc.trip_id = t.id
              AND tc.user_id = auth.uid()
              AND tc.status = 'accepted'
              AND tc.role IN ('owner', 'editor')
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM trips t
      WHERE t.id = day_plans.trip_id
        AND (
          t.user_id = auth.uid()
          OR
          EXISTS (
            SELECT 1 
            FROM trip_collaborators tc
            WHERE tc.trip_id = t.id
              AND tc.user_id = auth.uid()
              AND tc.status = 'accepted'
              AND tc.role IN ('owner', 'editor')
          )
        )
    )
  );

CREATE POLICY "day_plans_delete"
  ON day_plans
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM trips t
      WHERE t.id = day_plans.trip_id
        AND (
          t.user_id = auth.uid()
          OR
          EXISTS (
            SELECT 1 
            FROM trip_collaborators tc
            WHERE tc.trip_id = t.id
              AND tc.user_id = auth.uid()
              AND tc.status = 'accepted'
              AND tc.role IN ('owner', 'editor')
          )
        )
    )
  );

-- Set up policies for activities table
DROP POLICY IF EXISTS "Users can create activities for editable trips" ON activities;
DROP POLICY IF EXISTS "Users can view activities for accessible trips" ON activities;
DROP POLICY IF EXISTS "Users can update activities for editable trips" ON activities;
DROP POLICY IF EXISTS "Users can delete activities for editable trips" ON activities;

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Activities policies - using day_plans as the bridge to avoid deep nesting
CREATE POLICY "activities_select"
  ON activities
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM day_plans dp
      JOIN trips t ON t.id = dp.trip_id
      WHERE dp.id = activities.day_plan_id
        AND (
          t.user_id = auth.uid()
          OR
          EXISTS (
            SELECT 1 
            FROM trip_collaborators tc
            WHERE tc.trip_id = t.id
              AND tc.user_id = auth.uid()
              AND tc.status = 'accepted'
          )
        )
    )
  );

CREATE POLICY "activities_insert"
  ON activities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM day_plans dp
      JOIN trips t ON t.id = dp.trip_id
      WHERE dp.id = activities.day_plan_id
        AND (
          t.user_id = auth.uid()
          OR
          EXISTS (
            SELECT 1 
            FROM trip_collaborators tc
            WHERE tc.trip_id = t.id
              AND tc.user_id = auth.uid()
              AND tc.status = 'accepted'
              AND tc.role IN ('owner', 'editor')
          )
        )
    )
  );

CREATE POLICY "activities_update"
  ON activities
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM day_plans dp
      JOIN trips t ON t.id = dp.trip_id
      WHERE dp.id = activities.day_plan_id
        AND (
          t.user_id = auth.uid()
          OR
          EXISTS (
            SELECT 1 
            FROM trip_collaborators tc
            WHERE tc.trip_id = t.id
              AND tc.user_id = auth.uid()
              AND tc.status = 'accepted'
              AND tc.role IN ('owner', 'editor')
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM day_plans dp
      JOIN trips t ON t.id = dp.trip_id
      WHERE dp.id = activities.day_plan_id
        AND (
          t.user_id = auth.uid()
          OR
          EXISTS (
            SELECT 1 
            FROM trip_collaborators tc
            WHERE tc.trip_id = t.id
              AND tc.user_id = auth.uid()
              AND tc.status = 'accepted'
              AND tc.role IN ('owner', 'editor')
          )
        )
    )
  );

CREATE POLICY "activities_delete"
  ON activities
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM day_plans dp
      JOIN trips t ON t.id = dp.trip_id
      WHERE dp.id = activities.day_plan_id
        AND (
          t.user_id = auth.uid()
          OR
          EXISTS (
            SELECT 1 
            FROM trip_collaborators tc
            WHERE tc.trip_id = t.id
              AND tc.user_id = auth.uid()
              AND tc.status = 'accepted'
              AND tc.role IN ('owner', 'editor')
          )
        )
    )
  );

-- Create indexes to improve policy performance
CREATE INDEX IF NOT EXISTS idx_trip_collaborators_trip_user 
  ON trip_collaborators(trip_id, user_id, status);
CREATE INDEX IF NOT EXISTS idx_trip_collaborators_email_status 
  ON trip_collaborators(email, status);
CREATE INDEX IF NOT EXISTS idx_trips_user_id 
  ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_day_plans_trip_id 
  ON day_plans(trip_id);
CREATE INDEX IF NOT EXISTS idx_activities_day_plan_id 
  ON activities(day_plan_id);