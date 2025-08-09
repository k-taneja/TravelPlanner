/*
  # Complete Database Rebuild - Fix RLS Recursion Issues

  This migration completely rebuilds the database schema with simple, 
  non-recursive RLS policies that will never cause infinite recursion.

  1. Drop all existing tables and policies
  2. Create clean table structure
  3. Implement bulletproof RLS policies
  4. Add proper indexes and constraints
*/

-- Drop all existing tables and their dependencies
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS day_plans CASCADE;
DROP TABLE IF EXISTS trip_collaborators CASCADE;
DROP TABLE IF EXISTS trips CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop any existing functions that might cause recursion
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_trip_collaborators_updated_at() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Create simple update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create users table (simple profile table)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Simple users policies - NO RECURSION
CREATE POLICY "users_select_own" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_insert_own" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Create trips table
CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    destination TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    budget INTEGER DEFAULT 0,
    pace TEXT DEFAULT 'balanced' CHECK (pace IN ('relaxed', 'balanced', 'fast')),
    interests TEXT[] DEFAULT '{}',
    total_cost INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on trips
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- SIMPLE trips policies - NO RECURSION, NO SUBQUERIES
CREATE POLICY "trips_select_own" ON trips
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "trips_insert_own" ON trips
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "trips_update_own" ON trips
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "trips_delete_own" ON trips
    FOR DELETE USING (auth.uid() = user_id);

-- Create day_plans table
CREATE TABLE day_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL,
    date DATE NOT NULL,
    total_cost INTEGER DEFAULT 0,
    total_duration INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on day_plans
ALTER TABLE day_plans ENABLE ROW LEVEL SECURITY;

-- SIMPLE day_plans policies - NO RECURSION
CREATE POLICY "day_plans_select" ON day_plans
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM trips 
            WHERE trips.id = day_plans.trip_id 
            AND trips.user_id = auth.uid()
        )
    );

CREATE POLICY "day_plans_insert" ON day_plans
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM trips 
            WHERE trips.id = day_plans.trip_id 
            AND trips.user_id = auth.uid()
        )
    );

CREATE POLICY "day_plans_update" ON day_plans
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM trips 
            WHERE trips.id = day_plans.trip_id 
            AND trips.user_id = auth.uid()
        )
    );

CREATE POLICY "day_plans_delete" ON day_plans
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM trips 
            WHERE trips.id = day_plans.trip_id 
            AND trips.user_id = auth.uid()
        )
    );

-- Create activities table
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day_plan_id UUID NOT NULL REFERENCES day_plans(id) ON DELETE CASCADE,
    time TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'attraction' CHECK (type IN ('attraction', 'food', 'transport', 'shopping', 'nature', 'history')),
    description TEXT DEFAULT '',
    duration INTEGER DEFAULT 0,
    cost INTEGER DEFAULT 0,
    location_lat DECIMAL,
    location_lng DECIMAL,
    location_address TEXT DEFAULT '',
    why_this TEXT DEFAULT '',
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on activities
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- SIMPLE activities policies - NO RECURSION
CREATE POLICY "activities_select" ON activities
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM day_plans 
            JOIN trips ON trips.id = day_plans.trip_id
            WHERE day_plans.id = activities.day_plan_id 
            AND trips.user_id = auth.uid()
        )
    );

CREATE POLICY "activities_insert" ON activities
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM day_plans 
            JOIN trips ON trips.id = day_plans.trip_id
            WHERE day_plans.id = activities.day_plan_id 
            AND trips.user_id = auth.uid()
        )
    );

CREATE POLICY "activities_update" ON activities
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM day_plans 
            JOIN trips ON trips.id = day_plans.trip_id
            WHERE day_plans.id = activities.day_plan_id 
            AND trips.user_id = auth.uid()
        )
    );

CREATE POLICY "activities_delete" ON activities
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM day_plans 
            JOIN trips ON trips.id = day_plans.trip_id
            WHERE day_plans.id = activities.day_plan_id 
            AND trips.user_id = auth.uid()
        )
    );

-- Add indexes for performance
CREATE INDEX idx_trips_user_id ON trips(user_id);
CREATE INDEX idx_day_plans_trip_id ON day_plans(trip_id);
CREATE INDEX idx_activities_day_plan_id ON activities(day_plan_id);
CREATE INDEX idx_activities_order ON activities(day_plan_id, order_index);

-- Add update triggers
CREATE TRIGGER update_trips_updated_at
    BEFORE UPDATE ON trips
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create user profile
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();