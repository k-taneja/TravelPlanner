/*
  # Add Multi-Destination Trip Support

  This migration adds support for multi-destination trips with the following features:
  1. Trip types (single, multi_fixed, multi_flexible)
  2. Destinations table for managing multiple destinations per trip
  3. Trip segments for tracking time allocation and travel between destinations
  4. Enhanced day plans with destination associations

  ## New Tables
  - `destinations` - Stores individual destinations within a trip
  - `trip_segments` - Manages time allocation and travel between destinations

  ## Modified Tables
  - `trips` - Added multi-destination support fields
  - `day_plans` - Added destination association

  ## Security
  - RLS enabled on all new tables
  - Policies ensure users can only access their own trip data
*/

-- Add multi-destination support to trips table
ALTER TABLE trips ADD COLUMN IF NOT EXISTS is_multi_destination boolean DEFAULT false;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS total_destinations integer DEFAULT 1;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS trip_type text DEFAULT 'single';
ALTER TABLE trips ADD COLUMN IF NOT EXISTS transport_preferences text DEFAULT 'balanced';

-- Add constraint for trip_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'trips_trip_type_check' AND table_name = 'trips'
  ) THEN
    ALTER TABLE trips ADD CONSTRAINT trips_trip_type_check 
    CHECK (trip_type = ANY (ARRAY['single'::text, 'multi_fixed'::text, 'multi_flexible'::text]));
  END IF;
END $$;

-- Create destinations table
CREATE TABLE IF NOT EXISTS destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name text NOT NULL,
  country text,
  order_index integer NOT NULL DEFAULT 0,
  planned_days integer NOT NULL DEFAULT 1,
  actual_days integer,
  arrival_date date,
  departure_date date,
  budget_allocation integer DEFAULT 0,
  total_cost integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for destinations
CREATE INDEX IF NOT EXISTS idx_destinations_trip_id ON destinations(trip_id);
CREATE INDEX IF NOT EXISTS idx_destinations_order ON destinations(trip_id, order_index);

-- Enable RLS on destinations
ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for destinations
CREATE POLICY "destinations_owner_only_select"
  ON destinations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = destinations.trip_id 
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "destinations_owner_only_insert"
  ON destinations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = destinations.trip_id 
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "destinations_owner_only_update"
  ON destinations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = destinations.trip_id 
      AND trips.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = destinations.trip_id 
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "destinations_owner_only_delete"
  ON destinations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = destinations.trip_id 
      AND trips.user_id = auth.uid()
    )
  );

-- Create trip_segments table for managing travel between destinations
CREATE TABLE IF NOT EXISTS trip_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  destination_id uuid NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
  segment_order integer NOT NULL DEFAULT 0,
  start_date date NOT NULL,
  end_date date NOT NULL,
  days_count integer NOT NULL,
  budget_allocated integer DEFAULT 0,
  actual_cost integer DEFAULT 0,
  transport_to_next text,
  transport_cost integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for trip_segments
CREATE INDEX IF NOT EXISTS idx_trip_segments_trip_id ON trip_segments(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_segments_destination ON trip_segments(destination_id);

-- Enable RLS on trip_segments
ALTER TABLE trip_segments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for trip_segments
CREATE POLICY "trip_segments_owner_only_select"
  ON trip_segments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_segments.trip_id 
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "trip_segments_owner_only_insert"
  ON trip_segments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_segments.trip_id 
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "trip_segments_owner_only_update"
  ON trip_segments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_segments.trip_id 
      AND trips.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_segments.trip_id 
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "trip_segments_owner_only_delete"
  ON trip_segments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_segments.trip_id 
      AND trips.user_id = auth.uid()
    )
  );

-- Add destination association to day_plans
ALTER TABLE day_plans ADD COLUMN IF NOT EXISTS destination_id uuid REFERENCES destinations(id) ON DELETE CASCADE;
ALTER TABLE day_plans ADD COLUMN IF NOT EXISTS is_travel_day boolean DEFAULT false;
ALTER TABLE day_plans ADD COLUMN IF NOT EXISTS travel_details text;

-- Create index for day_plans destination association
CREATE INDEX IF NOT EXISTS idx_day_plans_destination ON day_plans(destination_id);

-- Create trigger function for updating destinations updated_at
CREATE OR REPLACE FUNCTION update_destinations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for destinations
DROP TRIGGER IF EXISTS update_destinations_updated_at ON destinations;
CREATE TRIGGER update_destinations_updated_at
  BEFORE UPDATE ON destinations
  FOR EACH ROW
  EXECUTE FUNCTION update_destinations_updated_at();