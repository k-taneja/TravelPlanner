/*
  # Add archived column to trips table

  1. Schema Changes
    - Add `archived` boolean column to trips table with default false
    - Add index for efficient querying of archived trips
    - Update existing trips to have archived = false

  2. Security
    - No changes to RLS policies needed as archived trips still belong to users
*/

-- Add archived column to trips table
ALTER TABLE trips ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false;

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_trips_archived ON trips(user_id, archived);

-- Update existing trips to have archived = false (in case column existed before)
UPDATE trips SET archived = false WHERE archived IS NULL;