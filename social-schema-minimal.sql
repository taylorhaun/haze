-- ============================================
-- HAZE V2 - MINIMAL SOCIAL FEATURES SCHEMA
-- ============================================
-- Reuses existing auth.users, restaurants, saved_recs tables
-- Only adds essential social functionality

-- 1. ENHANCE EXISTING USERS TABLE (via auth.users metadata)
-- Instead of altering auth.users directly, use Supabase profiles pattern
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username VARCHAR(50) UNIQUE,
  display_name VARCHAR(100),
  bio TEXT,
  avatar_url TEXT,
  privacy_setting VARCHAR(20) DEFAULT 'friends', -- 'public', 'friends', 'private'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Username index for search
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- 2. FRIENDSHIPS TABLE - The core social connection
CREATE TABLE IF NOT EXISTS friendships (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'blocked'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(requester_id, addressee_id),
  CHECK (requester_id != addressee_id)
);

-- Friendship indexes
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

-- 3. ENHANCE EXISTING SAVED_RECS TABLE
-- Just add visibility control - reuse everything else!
ALTER TABLE saved_recs ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'friends';
ALTER TABLE saved_recs ADD COLUMN IF NOT EXISTS is_public_tags BOOLEAN DEFAULT false;

-- 4. PLACE SHARES TABLE (Optional - for tracking shares)
CREATE TABLE IF NOT EXISTS place_shares (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  saved_rec_id UUID REFERENCES saved_recs(id) ON DELETE CASCADE,
  shared_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  viewed_at TIMESTAMP
);

-- Share indexes
CREATE INDEX IF NOT EXISTS idx_place_shares_shared_with ON place_shares(shared_with);
CREATE INDEX IF NOT EXISTS idx_place_shares_shared_by ON place_shares(shared_by);

-- ============================================
-- USEFUL VIEWS (Reuse existing data!)
-- ============================================

-- Active friendships (bidirectional)
CREATE OR REPLACE VIEW active_friendships AS
SELECT 
  requester_id as user_id,
  addressee_id as friend_id,
  created_at as friendship_date
FROM friendships 
WHERE status = 'accepted'
UNION
SELECT 
  addressee_id as user_id,
  requester_id as friend_id,
  created_at as friendship_date
FROM friendships 
WHERE status = 'accepted';

-- Friend-visible places (reuses existing saved_recs!)
CREATE OR REPLACE VIEW friend_places AS
SELECT 
  sr.*,
  r.*,
  p.username as owner_username,
  p.display_name as owner_name
FROM saved_recs sr
JOIN restaurants r ON sr.restaurant_id = r.id
JOIN profiles p ON sr.user_id = p.id
WHERE sr.visibility IN ('friends', 'public');

-- ============================================
-- SIMPLE HELPER FUNCTIONS
-- ============================================

-- Check friendship status
CREATE OR REPLACE FUNCTION are_friends(user1_id UUID, user2_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM friendships 
    WHERE status = 'accepted' 
    AND ((requester_id = user1_id AND addressee_id = user2_id)
         OR (requester_id = user2_id AND addressee_id = user1_id))
  );
END;
$$ LANGUAGE plpgsql;

-- Get places visible to a user from friends
CREATE OR REPLACE FUNCTION get_friend_places(viewer_id UUID)
RETURNS TABLE(
  saved_rec_id UUID,
  restaurant_name TEXT,
  address TEXT,
  rating FLOAT4,
  tags TEXT[],
  owner_username TEXT,
  owner_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sr.id,
    r.name,
    r.address,
    r.rating,
    CASE 
      WHEN sr.is_public_tags THEN sr.tags 
      ELSE ARRAY[]::TEXT[]
    END as tags,
    p.username,
    p.display_name
  FROM saved_recs sr
  JOIN restaurants r ON sr.restaurant_id = r.id
  JOIN profiles p ON sr.user_id = p.id
  WHERE sr.visibility = 'friends'
    AND sr.user_id IN (
      SELECT friend_id FROM active_friendships WHERE user_id = viewer_id
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Profiles security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view public profiles" ON profiles
  FOR SELECT USING (privacy_setting = 'public' OR id = auth.uid());
CREATE POLICY "Users can manage their own profile" ON profiles
  FOR ALL USING (id = auth.uid());

-- Friendships security  
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their friendships" ON friendships
  FOR ALL USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Place shares security
ALTER TABLE place_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their shares" ON place_shares
  FOR ALL USING (auth.uid() = shared_by OR auth.uid() = shared_with);

-- ============================================
-- MIGRATION FOR EXISTING USERS
-- ============================================

-- Create profiles for existing auth.users
INSERT INTO profiles (id, username, display_name)
SELECT 
  id, 
  REPLACE(LOWER(email), '@', '_at_') as username,
  COALESCE(raw_user_meta_data->>'full_name', SPLIT_PART(email, '@', 1)) as display_name
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Set visibility for existing saved_recs (default to friends)
UPDATE saved_recs 
SET visibility = 'friends' 
WHERE visibility IS NULL; 