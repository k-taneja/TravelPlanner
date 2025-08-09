/*
  # Update User Preferences Schema

  1. Schema Changes
    - Remove accommodation_type column
    - Remove accessibility_needs column  
    - Add travel_preferences column for natural language input
    
  2. Data Migration
    - Safely handle existing data
    - Set default values for new column
*/

-- Add new travel_preferences column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'travel_preferences'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN travel_preferences text DEFAULT '';
  END IF;
END $$;

-- Remove accommodation_type column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'accommodation_type'
  ) THEN
    ALTER TABLE user_preferences DROP COLUMN accommodation_type;
  END IF;
END $$;

-- Remove accessibility_needs column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'accessibility_needs'
  ) THEN
    ALTER TABLE user_preferences DROP COLUMN accessibility_needs;
  END IF;
END $$;