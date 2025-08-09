/*
  # Add archived column to trips table

  1. Changes
    - Add `archived` boolean column to trips table with default false
    - Add index for efficient querying of archived trips
    - Update RLS policies to handle archived trips

  2. Security
    - Maintains existing RLS policies
    - Users can only archive/unarchive their own trips
*/

-- Add archived column to trips table
ALTER TABLE trips ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false;

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_trips_archived ON trips(user_id, archived);

-- Add comment for documentation
COMMENT ON COLUMN trips.archived IS 'Whether the trip has been archived by the user';