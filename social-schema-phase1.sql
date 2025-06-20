-- ============================================
-- HAZE V2 - SOCIAL FEATURES PHASE 1 SCHEMA
-- ============================================

-- 1. USERS TABLE ENHANCEMENTS
-- Add social profile fields to existing users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_privacy VARCHAR(20) DEFAULT 'friends'; -- 'public', 'friends', 'private'
ALTER TABLE users ADD COLUMN IF NOT EXISTS allow_friend_requests BOOLEAN DEFAULT true;

-- Create index for username lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- 2. FRIENDSHIPS TABLE
-- Mutual friendship system with pending/accepted states
CREATE TABLE IF NOT EXISTS friendships (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  requester_id UUID REFERENCES users(id) ON DELETE CASCADE,
  addressee_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'blocked'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure no duplicate friendship requests
  UNIQUE(requester_id, addressee_id),
  -- Ensure users can't friend themselves
  CHECK (requester_id != addressee_id)
);

-- Indexes for friendship queries
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

-- 3. SAVED_RECS TABLE ENHANCEMENTS
-- Add place visibility and sharing controls
ALTER TABLE saved_recs ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'friends'; -- 'private', 'friends'
ALTER TABLE saved_recs ADD COLUMN IF NOT EXISTS allow_reshare BOOLEAN DEFAULT true;

-- 4. TAGS SYSTEM ENHANCEMENT
-- Split tags into private and public categories
CREATE TABLE IF NOT EXISTS place_tags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  saved_rec_id UUID REFERENCES saved_recs(id) ON DELETE CASCADE,
  tag_name VARCHAR(100) NOT NULL,
  tag_type VARCHAR(20) DEFAULT 'private', -- 'private', 'public'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for tag queries
CREATE INDEX IF NOT EXISTS idx_place_tags_saved_rec ON place_tags(saved_rec_id);
CREATE INDEX IF NOT EXISTS idx_place_tags_type ON place_tags(tag_type);
CREATE INDEX IF NOT EXISTS idx_place_tags_name ON place_tags(tag_name);

-- 5. PLACE SHARES TABLE
-- Track when places are shared between friends
CREATE TABLE IF NOT EXISTS place_shares (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  saved_rec_id UUID REFERENCES saved_recs(id) ON DELETE CASCADE,
  shared_by UUID REFERENCES users(id) ON DELETE CASCADE,
  shared_with UUID REFERENCES users(id) ON DELETE CASCADE,
  message TEXT, -- Optional message with the share
  created_at TIMESTAMP DEFAULT NOW(),
  viewed_at TIMESTAMP -- Track if/when recipient viewed the share
);

-- Indexes for share queries
CREATE INDEX IF NOT EXISTS idx_place_shares_shared_with ON place_shares(shared_with);
CREATE INDEX IF NOT EXISTS idx_place_shares_shared_by ON place_shares(shared_by);

-- 6. USER DISCOVERY TABLE
-- For finding friends by different methods
CREATE TABLE IF NOT EXISTS user_discovery (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  discovery_type VARCHAR(20), -- 'phone', 'email', 'invite_code'
  discovery_value VARCHAR(255),
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(discovery_type, discovery_value)
);

-- Index for discovery lookups
CREATE INDEX IF NOT EXISTS idx_user_discovery_type_value ON user_discovery(discovery_type, discovery_value);

-- ============================================
-- USEFUL VIEWS FOR SOCIAL QUERIES
-- ============================================

-- View: Active Friendships (both directions)
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

-- View: Friend-visible Places (places a user can see from friends)
CREATE OR REPLACE VIEW friend_visible_places AS
SELECT 
  sr.*,
  u.display_name as owner_name,
  u.username as owner_username
FROM saved_recs sr
JOIN users u ON sr.user_id = u.id
WHERE sr.visibility = 'friends';

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function: Check if two users are friends
CREATE OR REPLACE FUNCTION are_users_friends(user1_id UUID, user2_id UUID)
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

-- Function: Get user's friends list
CREATE OR REPLACE FUNCTION get_user_friends(user_uuid UUID)
RETURNS TABLE(friend_id UUID, friend_username VARCHAR, friend_display_name VARCHAR, friendship_date TIMESTAMP) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    af.friend_id,
    u.username,
    u.display_name,
    af.friendship_date
  FROM active_friendships af
  JOIN users u ON af.friend_id = u.id
  WHERE af.user_id = user_uuid
  ORDER BY af.friendship_date DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on new tables
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE place_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE place_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_discovery ENABLE ROW LEVEL SECURITY;

-- Friendship policies - users can see their own friendship requests
CREATE POLICY "Users can view their own friendships" ON friendships
  FOR ALL USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Place tags policies - users can manage their own place tags
CREATE POLICY "Users can manage their own place tags" ON place_tags
  FOR ALL USING (
    EXISTS(
      SELECT 1 FROM saved_recs sr 
      WHERE sr.id = place_tags.saved_rec_id 
      AND sr.user_id = auth.uid()
    )
  );

-- Place shares policies - users can see shares they sent or received
CREATE POLICY "Users can view relevant place shares" ON place_shares
  FOR ALL USING (auth.uid() = shared_by OR auth.uid() = shared_with);

-- User discovery policies - users can manage their own discovery methods
CREATE POLICY "Users can manage their own discovery methods" ON user_discovery
  FOR ALL USING (auth.uid() = user_id); 