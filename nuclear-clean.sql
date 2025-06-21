-- ============================================
-- NUCLEAR CLEANUP - REMOVE ALL LIST OBJECTS
-- ============================================
-- This script aggressively removes all list-related objects

-- First, disable RLS to avoid conflicts
ALTER TABLE IF EXISTS list_places DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS list_collaborators DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lists DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS collaborative_lists DISABLE ROW LEVEL SECURITY;

-- Drop all policies manually (in case CASCADE doesn't work)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on list_places
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'list_places') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON list_places';
    END LOOP;
    
    -- Drop all policies on list_collaborators
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'list_collaborators') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON list_collaborators';
    END LOOP;
    
    -- Drop all policies on lists
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'lists') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON lists';
    END LOOP;
    
    -- Drop all policies on collaborative_lists
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'collaborative_lists') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON collaborative_lists';
    END LOOP;
END $$;

-- Drop functions
DROP FUNCTION IF EXISTS can_user_access_list(UUID, UUID);
DROP FUNCTION IF EXISTS can_user_edit_list(UUID, UUID);
DROP FUNCTION IF EXISTS get_list_places(UUID);

-- Drop views
DROP VIEW IF EXISTS user_accessible_lists;
DROP VIEW IF EXISTS list_details;

-- Drop tables with CASCADE
DROP TABLE IF EXISTS list_places CASCADE;
DROP TABLE IF EXISTS list_collaborators CASCADE;
DROP TABLE IF EXISTS lists CASCADE;
DROP TABLE IF EXISTS collaborative_lists CASCADE;

-- ============================================
-- FRESH LISTS SCHEMA
-- ============================================

-- 1. LISTS TABLE
CREATE TABLE lists (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. LIST COLLABORATORS TABLE
CREATE TABLE list_collaborators (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  list_id UUID REFERENCES lists(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'collaborator',
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(list_id, user_id)
);

-- 3. LIST PLACES TABLE
CREATE TABLE list_places (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  list_id UUID REFERENCES lists(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(list_id, restaurant_id)
);

-- Create indexes
CREATE INDEX idx_lists_owner ON lists(owner_id);
CREATE INDEX idx_lists_public ON lists(is_public);
CREATE INDEX idx_list_collaborators_list ON list_collaborators(list_id);
CREATE INDEX idx_list_collaborators_user ON list_collaborators(user_id);
CREATE INDEX idx_list_places_list ON list_places(list_id);
CREATE INDEX idx_list_places_restaurant ON list_places(restaurant_id);
CREATE INDEX idx_list_places_added_by ON list_places(added_by);

-- Enable RLS
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_places ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view accessible lists" ON lists
  FOR SELECT USING (
    owner_id = auth.uid() 
    OR is_public = true
    OR id IN (
      SELECT list_id FROM list_collaborators 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own lists" ON lists
  FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "Users can view collaborators of accessible lists" ON list_collaborators
  FOR SELECT USING (
    list_id IN (
      SELECT id FROM lists 
      WHERE owner_id = auth.uid() 
      OR is_public = true
      OR id IN (
        SELECT list_id FROM list_collaborators lc2
        WHERE lc2.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "List owners can manage collaborators" ON list_collaborators
  FOR ALL USING (
    list_id IN (
      SELECT id FROM lists 
      WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can view places in accessible lists" ON list_places
  FOR SELECT USING (
    list_id IN (
      SELECT id FROM lists 
      WHERE owner_id = auth.uid() 
      OR is_public = true
      OR id IN (
        SELECT list_id FROM list_collaborators 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Collaborators can add places to lists" ON list_places
  FOR INSERT WITH CHECK (
    list_id IN (
      SELECT id FROM lists 
      WHERE owner_id = auth.uid()
    )
    OR
    list_id IN (
      SELECT list_id FROM list_collaborators 
      WHERE user_id = auth.uid() 
      AND role = 'collaborator'
    )
  );

CREATE POLICY "Users can update places they added" ON list_places
  FOR UPDATE USING (added_by = auth.uid());

CREATE POLICY "List owners and place adders can delete places" ON list_places
  FOR DELETE USING (
    added_by = auth.uid()
    OR
    list_id IN (
      SELECT id FROM lists 
      WHERE owner_id = auth.uid()
    )
  );

-- Create helper functions
CREATE OR REPLACE FUNCTION can_user_access_list(list_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM lists 
    WHERE id = list_uuid 
    AND (
      owner_id = user_uuid 
      OR is_public = true
      OR id IN (
        SELECT list_id FROM list_collaborators 
        WHERE user_id = user_uuid
      )
    )
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION can_user_edit_list(list_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM lists 
    WHERE id = list_uuid 
    AND (
      owner_id = user_uuid 
      OR id IN (
        SELECT list_id FROM list_collaborators 
        WHERE user_id = user_uuid 
        AND role = 'collaborator'
      )
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION can_user_access_list(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_edit_list(UUID, UUID) TO authenticated; 