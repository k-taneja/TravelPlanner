/*
  # Add Trip Sharing and Collaboration Features

  1. New Tables
    - `trip_shares` - Manages shared trips and permissions
    - `trip_activity_logs` - Tracks changes for collaboration
    - `trip_invitations` - Manages pending invitations

  2. Security
    - Enable RLS on all new tables
    - Add policies for shared access
    - Maintain data integrity with proper constraints

  3. Indexes
    - Optimize for sharing queries
    - Support real-time collaboration lookups
*/

-- Create trip_shares table for managing shared access
CREATE TABLE IF NOT EXISTS trip_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  shared_with_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_level text NOT NULL DEFAULT 'view' CHECK (permission_level IN ('view', 'edit', 'admin')),
  share_token text UNIQUE DEFAULT encode(gen_random_bytes(32), 'base64url'),
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(trip_id, shared_with_user_id)
);

-- Create trip_invitations table for pending invitations
CREATE TABLE IF NOT EXISTS trip_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  invited_email text NOT NULL,
  invited_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_level text NOT NULL DEFAULT 'view' CHECK (permission_level IN ('view', 'edit', 'admin')),
  invitation_token text UNIQUE DEFAULT encode(gen_random_bytes(32), 'base64url'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(trip_id, invited_email)
);

-- Create trip_activity_logs table for collaboration tracking
CREATE TABLE IF NOT EXISTS trip_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('trip', 'day_plan', 'activity')),
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_trip_shares_trip_id ON trip_shares(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_shares_user_id ON trip_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_trip_shares_token ON trip_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_trip_invitations_trip_id ON trip_invitations(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_invitations_email ON trip_invitations(invited_email);
CREATE INDEX IF NOT EXISTS idx_trip_invitations_token ON trip_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_trip_activity_logs_trip_id ON trip_activity_logs(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_activity_logs_created_at ON trip_activity_logs(created_at DESC);

-- Enable RLS
ALTER TABLE trip_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trip_shares
CREATE POLICY "Users can view shares for their trips"
  ON trip_shares FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_shares.trip_id 
      AND trips.user_id = auth.uid()
    )
    OR shared_with_user_id = auth.uid()
  );

CREATE POLICY "Trip owners can create shares"
  ON trip_shares FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_shares.trip_id 
      AND trips.user_id = auth.uid()
    )
    AND shared_by_user_id = auth.uid()
  );

CREATE POLICY "Trip owners and admins can update shares"
  ON trip_shares FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_shares.trip_id 
      AND trips.user_id = auth.uid()
    )
    OR (
      shared_with_user_id = auth.uid() 
      AND permission_level = 'admin'
    )
  );

CREATE POLICY "Trip owners and admins can delete shares"
  ON trip_shares FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_shares.trip_id 
      AND trips.user_id = auth.uid()
    )
    OR (
      shared_with_user_id = auth.uid() 
      AND permission_level = 'admin'
    )
  );

-- RLS Policies for trip_invitations
CREATE POLICY "Users can view invitations for their trips"
  ON trip_invitations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_invitations.trip_id 
      AND trips.user_id = auth.uid()
    )
    OR invited_by_user_id = auth.uid()
  );

CREATE POLICY "Trip owners can create invitations"
  ON trip_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_invitations.trip_id 
      AND trips.user_id = auth.uid()
    )
    AND invited_by_user_id = auth.uid()
  );

CREATE POLICY "Trip owners can update invitations"
  ON trip_invitations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_invitations.trip_id 
      AND trips.user_id = auth.uid()
    )
    OR invited_by_user_id = auth.uid()
  );

CREATE POLICY "Trip owners can delete invitations"
  ON trip_invitations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_invitations.trip_id 
      AND trips.user_id = auth.uid()
    )
    OR invited_by_user_id = auth.uid()
  );

-- RLS Policies for trip_activity_logs
CREATE POLICY "Users can view activity logs for accessible trips"
  ON trip_activity_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_activity_logs.trip_id 
      AND trips.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM trip_shares 
      WHERE trip_shares.trip_id = trip_activity_logs.trip_id 
      AND trip_shares.shared_with_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create activity logs for accessible trips"
  ON trip_activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM trips 
        WHERE trips.id = trip_activity_logs.trip_id 
        AND trips.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM trip_shares 
        WHERE trip_shares.trip_id = trip_activity_logs.trip_id 
        AND trip_shares.shared_with_user_id = auth.uid()
        AND trip_shares.permission_level IN ('edit', 'admin')
      )
    )
  );

-- Update existing trips policies to include shared access
DROP POLICY IF EXISTS "trips_select_own" ON trips;
DROP POLICY IF EXISTS "trips_update_own" ON trips;
DROP POLICY IF EXISTS "trips_delete_own" ON trips;

CREATE POLICY "trips_select_accessible"
  ON trips FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM trip_shares 
      WHERE trip_shares.trip_id = trips.id 
      AND trip_shares.shared_with_user_id = auth.uid()
    )
  );

CREATE POLICY "trips_update_editable"
  ON trips FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM trip_shares 
      WHERE trip_shares.trip_id = trips.id 
      AND trip_shares.shared_with_user_id = auth.uid()
      AND trip_shares.permission_level IN ('edit', 'admin')
    )
  );

CREATE POLICY "trips_delete_own"
  ON trips FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Update day_plans policies for shared access
DROP POLICY IF EXISTS "day_plans_select" ON day_plans;
DROP POLICY IF EXISTS "day_plans_insert" ON day_plans;
DROP POLICY IF EXISTS "day_plans_update" ON day_plans;
DROP POLICY IF EXISTS "day_plans_delete" ON day_plans;

CREATE POLICY "day_plans_select_accessible"
  ON day_plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = day_plans.trip_id 
      AND (
        trips.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM trip_shares 
          WHERE trip_shares.trip_id = trips.id 
          AND trip_shares.shared_with_user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "day_plans_insert_editable"
  ON day_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = day_plans.trip_id 
      AND (
        trips.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM trip_shares 
          WHERE trip_shares.trip_id = trips.id 
          AND trip_shares.shared_with_user_id = auth.uid()
          AND trip_shares.permission_level IN ('edit', 'admin')
        )
      )
    )
  );

CREATE POLICY "day_plans_update_editable"
  ON day_plans FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = day_plans.trip_id 
      AND (
        trips.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM trip_shares 
          WHERE trip_shares.trip_id = trips.id 
          AND trip_shares.shared_with_user_id = auth.uid()
          AND trip_shares.permission_level IN ('edit', 'admin')
        )
      )
    )
  );

CREATE POLICY "day_plans_delete_editable"
  ON day_plans FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = day_plans.trip_id 
      AND (
        trips.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM trip_shares 
          WHERE trip_shares.trip_id = trips.id 
          AND trip_shares.shared_with_user_id = auth.uid()
          AND trip_shares.permission_level IN ('edit', 'admin')
        )
      )
    )
  );

-- Update activities policies for shared access
DROP POLICY IF EXISTS "activities_select" ON activities;
DROP POLICY IF EXISTS "activities_insert" ON activities;
DROP POLICY IF EXISTS "activities_update" ON activities;
DROP POLICY IF EXISTS "activities_delete" ON activities;

CREATE POLICY "activities_select_accessible"
  ON activities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM day_plans 
      JOIN trips ON trips.id = day_plans.trip_id
      WHERE day_plans.id = activities.day_plan_id 
      AND (
        trips.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM trip_shares 
          WHERE trip_shares.trip_id = trips.id 
          AND trip_shares.shared_with_user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "activities_insert_editable"
  ON activities FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM day_plans 
      JOIN trips ON trips.id = day_plans.trip_id
      WHERE day_plans.id = activities.day_plan_id 
      AND (
        trips.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM trip_shares 
          WHERE trip_shares.trip_id = trips.id 
          AND trip_shares.shared_with_user_id = auth.uid()
          AND trip_shares.permission_level IN ('edit', 'admin')
        )
      )
    )
  );

CREATE POLICY "activities_update_editable"
  ON activities FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM day_plans 
      JOIN trips ON trips.id = day_plans.trip_id
      WHERE day_plans.id = activities.day_plan_id 
      AND (
        trips.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM trip_shares 
          WHERE trip_shares.trip_id = trips.id 
          AND trip_shares.shared_with_user_id = auth.uid()
          AND trip_shares.permission_level IN ('edit', 'admin')
        )
      )
    )
  );

CREATE POLICY "activities_delete_editable"
  ON activities FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM day_plans 
      JOIN trips ON trips.id = day_plans.trip_id
      WHERE day_plans.id = activities.day_plan_id 
      AND (
        trips.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM trip_shares 
          WHERE trip_shares.trip_id = trips.id 
          AND trip_shares.shared_with_user_id = auth.uid()
          AND trip_shares.permission_level IN ('edit', 'admin')
        )
      )
    )
  );

-- Create function to log activity changes
CREATE OR REPLACE FUNCTION log_trip_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log for authenticated users
  IF auth.uid() IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Insert activity log
  INSERT INTO trip_activity_logs (
    trip_id,
    user_id,
    action,
    entity_type,
    entity_id,
    old_data,
    new_data
  ) VALUES (
    CASE 
      WHEN TG_TABLE_NAME = 'trips' THEN COALESCE(NEW.id, OLD.id)
      WHEN TG_TABLE_NAME = 'day_plans' THEN COALESCE(NEW.trip_id, OLD.trip_id)
      WHEN TG_TABLE_NAME = 'activities' THEN (
        SELECT dp.trip_id FROM day_plans dp 
        WHERE dp.id = COALESCE(NEW.day_plan_id, OLD.day_plan_id)
      )
    END,
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for activity logging
DROP TRIGGER IF EXISTS log_trips_activity ON trips;
DROP TRIGGER IF EXISTS log_day_plans_activity ON day_plans;
DROP TRIGGER IF EXISTS log_activities_activity ON activities;

CREATE TRIGGER log_trips_activity
  AFTER INSERT OR UPDATE OR DELETE ON trips
  FOR EACH ROW EXECUTE FUNCTION log_trip_activity();

CREATE TRIGGER log_day_plans_activity
  AFTER INSERT OR UPDATE OR DELETE ON day_plans
  FOR EACH ROW EXECUTE FUNCTION log_trip_activity();

CREATE TRIGGER log_activities_activity
  AFTER INSERT OR UPDATE OR DELETE ON activities
  FOR EACH ROW EXECUTE FUNCTION log_trip_activity();

-- Update updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_trip_shares_updated_at
  BEFORE UPDATE ON trip_shares
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trip_invitations_updated_at
  BEFORE UPDATE ON trip_invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();