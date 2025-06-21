-- ============================================
-- LISTS SCHEMA
-- ============================================
-- Extends the existing social features with restaurant lists (both private and collaborative)

-- 1. LISTS TABLE
CREATE TABLE IF NOT EXISTS lists (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT false, -- Whether non-collaborators can view
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for lists
CREATE INDEX IF NOT EXISTS idx_lists_owner ON lists(owner_id);
CREATE INDEX IF NOT EXISTS idx_lists_public ON lists(is_public);

-- 2. LIST COLLABORATORS TABLE
CREATE TABLE IF NOT EXISTS list_collaborators (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  list_id UUID REFERENCES lists(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'collaborator', -- 'collaborator', 'viewer'
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure unique collaborator per list
  UNIQUE(list_id, user_id)
);

-- Indexes for list collaborators
CREATE INDEX IF NOT EXISTS idx_list_collaborators_list ON list_collaborators(list_id);
CREATE INDEX IF NOT EXISTS idx_list_collaborators_user ON list_collaborators(user_id);

-- 3. LIST PLACES TABLE
-- Links restaurants to lists
CREATE TABLE IF NOT EXISTS list_places (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  list_id UUID REFERENCES lists(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT, -- Collaborator's notes about this place on this list
  added_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure unique restaurant per list
  UNIQUE(list_id, restaurant_id)
);

-- Indexes for list places
CREATE INDEX IF NOT EXISTS idx_list_places_list ON list_places(list_id);
CREATE INDEX IF NOT EXISTS idx_list_places_restaurant ON list_places(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_list_places_added_by ON list_places(added_by);

-- ============================================
-- USEFUL VIEWS
-- ============================================

-- View: User's accessible lists (owned or collaborating)
CREATE OR REPLACE VIEW user_accessible_lists AS
SELECT 
  l.*,
  'owner' as user_role
FROM lists l
WHERE l.owner_id = auth.uid()
UNION
SELECT 
  l.*,
  lc.role as user_role
FROM lists l
JOIN list_collaborators lc ON l.id = lc.list_id
WHERE lc.user_id = auth.uid();

-- View: List details with collaborator count
CREATE OR REPLACE VIEW list_details AS
SELECT 
  l.*,
  p.display_name as owner_name,
  p.username as owner_username,
  COUNT(DISTINCT lc.user_id) as collaborator_count,
  COUNT(DISTINCT lp.restaurant_id) as place_count
FROM lists l
LEFT JOIN profiles p ON l.owner_id = p.id
LEFT JOIN list_collaborators lc ON l.id = lc.list_id
LEFT JOIN list_places lp ON l.id = lp.list_id
GROUP BY l.id, p.display_name, p.username;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function: Check if user can access a list
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

-- Function: Check if user can edit a list
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

-- Function: Get list places with restaurant details
CREATE OR REPLACE FUNCTION get_list_places(list_uuid UUID)
RETURNS TABLE(
  place_id UUID,
  restaurant_id UUID,
  restaurant_name TEXT,
  address TEXT,
  rating FLOAT4,
  price_level INTEGER,
  latitude FLOAT8,
  longitude FLOAT8,
  phone TEXT,
  website TEXT,
  notes TEXT,
  added_by_name TEXT,
  added_at TIMESTAMP
) AS $$
BEGIN
  -- Check if current user can access this list
  IF NOT can_user_access_list(list_uuid, auth.uid()) THEN
    RAISE EXCEPTION 'Access denied to list';
  END IF;

  RETURN QUERY
  SELECT 
    lp.id as place_id,
    r.id as restaurant_id,
    r.name as restaurant_name,
    r.address,
    r.rating,
    r.price_level,
    r.latitude,
    r.longitude,
    r.phone,
    r.website,
    lp.notes,
    p.display_name as added_by_name,
    lp.added_at
  FROM list_places lp
  JOIN restaurants r ON lp.restaurant_id = r.id
  LEFT JOIN profiles p ON lp.added_by = p.id
  WHERE lp.list_id = list_uuid
  ORDER BY lp.added_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_places ENABLE ROW LEVEL SECURITY;

-- Lists Policies
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

-- List Collaborators Policies
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

-- List Places Policies
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

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION can_user_access_list(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_edit_list(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_list_places(UUID) TO authenticated;

-- ============================================
-- EXAMPLE USAGE
-- ============================================

/*
-- Create a collaborative list
INSERT INTO lists (name, description, owner_id)
VALUES ('Date Night Spots', 'Special places for romantic dinners', auth.uid());

-- Add a collaborator (friend)
INSERT INTO list_collaborators (list_id, user_id, role, invited_by)
VALUES (
  (SELECT id FROM lists WHERE name = 'Date Night Spots' LIMIT 1),
  'friend-user-id-here',
  'collaborator',
  auth.uid()
);

-- Add a restaurant to the list
INSERT INTO list_places (list_id, restaurant_id, added_by, notes)
VALUES (
  (SELECT id FROM lists WHERE name = 'Date Night Spots' LIMIT 1),
  'restaurant-id-here',
  auth.uid(),
  'Amazing pasta and great atmosphere!'
);

-- Get all places in a list
SELECT * FROM get_list_places('list-id-here');
*/ 