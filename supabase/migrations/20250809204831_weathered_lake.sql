/*
  # Add Multi-Destination Trip Support

  1. Schema Changes
    - Add `destinations` table to store multiple destinations per trip
    - Add `trip_segments` table to manage destination-specific planning
    - Update `trips` table to support multi-destination metadata
    - Update `day_plans` to link to specific destinations

  2. New Tables
    - `destinations`: Stores each destination in a trip with duration
    - `trip_segments`: Links destinations to trips with ordering and duration
    
  3. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users to manage their own data
*/

-- Add destinations table
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

-- Add trip_segments table for better organization
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

-- Update trips table to support multi-destination
DO $$
BEGIN
  -- Add multi-destination support columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'is_multi_destination'
  ) THEN
    ALTER TABLE trips ADD COLUMN is_multi_destination boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'total_destinations'
  ) THEN
    ALTER TABLE trips ADD COLUMN total_destinations integer DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'trip_type'
  ) THEN
    ALTER TABLE trips ADD COLUMN trip_type text DEFAULT 'single' CHECK (trip_type IN ('single', 'multi_fixed', 'multi_flexible'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'transport_preferences'
  ) THEN
    ALTER TABLE trips ADD COLUMN transport_preferences text DEFAULT 'balanced';
  END IF;
END $$;

-- Update day_plans to link to destinations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'day_plans' AND column_name = 'destination_id'
  ) THEN
    ALTER TABLE day_plans ADD COLUMN destination_id uuid REFERENCES destinations(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'day_plans' AND column_name = 'is_travel_day'
  ) THEN
    ALTER TABLE day_plans ADD COLUMN is_travel_day boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'day_plans' AND column_name = 'travel_details'
  ) THEN
    ALTER TABLE day_plans ADD COLUMN travel_details text;
  END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_segments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for destinations
CREATE POLICY "destinations_owner_only_select"
  ON destinations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = destinations.trip_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "destinations_owner_only_insert"
  ON destinations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = destinations.trip_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "destinations_owner_only_update"
  ON destinations
  FOR UPDATE
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
  ON destinations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = destinations.trip_id
      AND trips.user_id = auth.uid()
    )
  );

-- RLS Policies for trip_segments
CREATE POLICY "trip_segments_owner_only_select"
  ON trip_segments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_segments.trip_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "trip_segments_owner_only_insert"
  ON trip_segments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_segments.trip_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "trip_segments_owner_only_update"
  ON trip_segments
  FOR UPDATE
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
  ON trip_segments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_segments.trip_id
      AND trips.user_id = auth.uid()
    )
  );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_destinations_trip_id ON destinations(trip_id);
CREATE INDEX IF NOT EXISTS idx_destinations_order ON destinations(trip_id, order_index);
CREATE INDEX IF NOT EXISTS idx_trip_segments_trip_id ON trip_segments(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_segments_destination ON trip_segments(destination_id);
CREATE INDEX IF NOT EXISTS idx_day_plans_destination ON day_plans(destination_id);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_destinations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_destinations_updated_at
  BEFORE UPDATE ON destinations
  FOR EACH ROW
  EXECUTE FUNCTION update_destinations_updated_at();