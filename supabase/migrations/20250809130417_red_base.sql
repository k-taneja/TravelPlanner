/*
  # Add Trip Collaboration Features

  1. New Tables
    - `trip_collaborators`
      - `id` (uuid, primary key)
      - `trip_id` (uuid, references trips)
      - `user_id` (uuid, references auth.users)
      - `email` (text, for pending invitations)
      - `role` (text, owner/editor/viewer)
      - `status` (text, pending/accepted/declined)
      - `invited_by` (uuid, references auth.users)
      - `invited_at` (timestamp)
      - `responded_at` (timestamp)

  2. Security
    - Enable RLS on `trip_collaborators` table
    - Add policies for trip owners and collaborators
    - Add policies for managing invitations

  3. Functions
    - Function to send collaboration invitations
    - Function to accept/decline invitations
*/

-- Create trip_collaborators table
CREATE TABLE IF NOT EXISTS trip_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  role text NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'editor', 'viewer')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_trip_collaborators_trip_id ON trip_collaborators(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_collaborators_user_id ON trip_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_collaborators_email ON trip_collaborators(email);
CREATE INDEX IF NOT EXISTS idx_trip_collaborators_status ON trip_collaborators(status);

-- Enable RLS
ALTER TABLE trip_collaborators ENABLE ROW LEVEL SECURITY;

-- Policies for trip_collaborators
CREATE POLICY "Users can view collaborators for their trips"
  ON trip_collaborators
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_collaborators.trip_id 
      AND trips.user_id = auth.uid()
    )
    OR 
    EXISTS (
      SELECT 1 FROM trip_collaborators tc2
      WHERE tc2.trip_id = trip_collaborators.trip_id 
      AND tc2.user_id = auth.uid() 
      AND tc2.status = 'accepted'
    )
    OR
    trip_collaborators.user_id = auth.uid()
    OR
    trip_collaborators.email = auth.email()
  );

CREATE POLICY "Trip owners can manage collaborators"
  ON trip_collaborators
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_collaborators.trip_id 
      AND trips.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_collaborators.trip_id 
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can respond to their own invitations"
  ON trip_collaborators
  FOR UPDATE
  TO authenticated
  USING (
    trip_collaborators.user_id = auth.uid() 
    OR 
    trip_collaborators.email = auth.email()
  )
  WITH CHECK (
    trip_collaborators.user_id = auth.uid() 
    OR 
    trip_collaborators.email = auth.email()
  );

-- Update trips policies to include collaborators
DROP POLICY IF EXISTS "Users can view own trips" ON trips;
CREATE POLICY "Users can view own trips and collaborated trips"
  ON trips
  FOR SELECT
  TO authenticated
  USING (
    trips.user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM trip_collaborators 
      WHERE trip_collaborators.trip_id = trips.id 
      AND trip_collaborators.user_id = auth.uid() 
      AND trip_collaborators.status = 'accepted'
    )
  );

DROP POLICY IF EXISTS "Users can update own trips" ON trips;
CREATE POLICY "Users can update own trips and collaborated trips with edit access"
  ON trips
  FOR UPDATE
  TO authenticated
  USING (
    trips.user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM trip_collaborators 
      WHERE trip_collaborators.trip_id = trips.id 
      AND trip_collaborators.user_id = auth.uid() 
      AND trip_collaborators.status = 'accepted'
      AND trip_collaborators.role IN ('owner', 'editor')
    )
  )
  WITH CHECK (
    trips.user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM trip_collaborators 
      WHERE trip_collaborators.trip_id = trips.id 
      AND trip_collaborators.user_id = auth.uid() 
      AND trip_collaborators.status = 'accepted'
      AND trip_collaborators.role IN ('owner', 'editor')
    )
  );

-- Update day_plans policies to include collaborators
DROP POLICY IF EXISTS "Users can view own day plans" ON day_plans;
CREATE POLICY "Users can view day plans for accessible trips"
  ON day_plans
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = day_plans.trip_id 
      AND (
        trips.user_id = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM trip_collaborators 
          WHERE trip_collaborators.trip_id = trips.id 
          AND trip_collaborators.user_id = auth.uid() 
          AND trip_collaborators.status = 'accepted'
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can create day plans for own trips" ON day_plans;
CREATE POLICY "Users can create day plans for editable trips"
  ON day_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = day_plans.trip_id 
      AND (
        trips.user_id = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM trip_collaborators 
          WHERE trip_collaborators.trip_id = trips.id 
          AND trip_collaborators.user_id = auth.uid() 
          AND trip_collaborators.status = 'accepted'
          AND trip_collaborators.role IN ('owner', 'editor')
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can update own day plans" ON day_plans;
CREATE POLICY "Users can update day plans for editable trips"
  ON day_plans
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = day_plans.trip_id 
      AND (
        trips.user_id = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM trip_collaborators 
          WHERE trip_collaborators.trip_id = trips.id 
          AND trip_collaborators.user_id = auth.uid() 
          AND trip_collaborators.status = 'accepted'
          AND trip_collaborators.role IN ('owner', 'editor')
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = day_plans.trip_id 
      AND (
        trips.user_id = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM trip_collaborators 
          WHERE trip_collaborators.trip_id = trips.id 
          AND trip_collaborators.user_id = auth.uid() 
          AND trip_collaborators.status = 'accepted'
          AND trip_collaborators.role IN ('owner', 'editor')
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete own day plans" ON day_plans;
CREATE POLICY "Users can delete day plans for editable trips"
  ON day_plans
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = day_plans.trip_id 
      AND (
        trips.user_id = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM trip_collaborators 
          WHERE trip_collaborators.trip_id = trips.id 
          AND trip_collaborators.user_id = auth.uid() 
          AND trip_collaborators.status = 'accepted'
          AND trip_collaborators.role IN ('owner', 'editor')
        )
      )
    )
  );

-- Update activities policies to include collaborators
DROP POLICY IF EXISTS "Users can view own activities" ON activities;
CREATE POLICY "Users can view activities for accessible trips"
  ON activities
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM day_plans 
      JOIN trips ON trips.id = day_plans.trip_id
      WHERE day_plans.id = activities.day_plan_id 
      AND (
        trips.user_id = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM trip_collaborators 
          WHERE trip_collaborators.trip_id = trips.id 
          AND trip_collaborators.user_id = auth.uid() 
          AND trip_collaborators.status = 'accepted'
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can create activities for own day plans" ON activities;
CREATE POLICY "Users can create activities for editable trips"
  ON activities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM day_plans 
      JOIN trips ON trips.id = day_plans.trip_id
      WHERE day_plans.id = activities.day_plan_id 
      AND (
        trips.user_id = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM trip_collaborators 
          WHERE trip_collaborators.trip_id = trips.id 
          AND trip_collaborators.user_id = auth.uid() 
          AND trip_collaborators.status = 'accepted'
          AND trip_collaborators.role IN ('owner', 'editor')
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can update own activities" ON activities;
CREATE POLICY "Users can update activities for editable trips"
  ON activities
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM day_plans 
      JOIN trips ON trips.id = day_plans.trip_id
      WHERE day_plans.id = activities.day_plan_id 
      AND (
        trips.user_id = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM trip_collaborators 
          WHERE trip_collaborators.trip_id = trips.id 
          AND trip_collaborators.user_id = auth.uid() 
          AND trip_collaborators.status = 'accepted'
          AND trip_collaborators.role IN ('owner', 'editor')
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM day_plans 
      JOIN trips ON trips.id = day_plans.trip_id
      WHERE day_plans.id = activities.day_plan_id 
      AND (
        trips.user_id = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM trip_collaborators 
          WHERE trip_collaborators.trip_id = trips.id 
          AND trip_collaborators.user_id = auth.uid() 
          AND trip_collaborators.status = 'accepted'
          AND trip_collaborators.role IN ('owner', 'editor')
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can delete own activities" ON activities;
CREATE POLICY "Users can delete activities for editable trips"
  ON activities
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM day_plans 
      JOIN trips ON trips.id = day_plans.trip_id
      WHERE day_plans.id = activities.day_plan_id 
      AND (
        trips.user_id = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM trip_collaborators 
          WHERE trip_collaborators.trip_id = trips.id 
          AND trip_collaborators.user_id = auth.uid() 
          AND trip_collaborators.status = 'accepted'
          AND trip_collaborators.role IN ('owner', 'editor')
        )
      )
    )
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_trip_collaborators_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_trip_collaborators_updated_at
  BEFORE UPDATE ON trip_collaborators
  FOR EACH ROW
  EXECUTE FUNCTION update_trip_collaborators_updated_at();