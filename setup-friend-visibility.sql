-- ============================================
-- FRIEND VISIBILITY POLICIES FOR SAVED_RECS
-- ============================================
-- This script adds RLS policies to allow friends to view each other's saved places

-- First, we need to modify the existing saved_recs RLS policies to allow friends access

-- Drop existing restrictive policy if it exists
DROP POLICY IF EXISTS "Users can view own saved_recs" ON saved_recs;

-- Create new comprehensive policy that allows:
-- 1. Users to see their own saved_recs
-- 2. Users to see friends' saved_recs where visibility = 'friends'
CREATE POLICY "Users can view accessible saved_recs" ON saved_recs
  FOR SELECT USING (
    -- User can see their own saved_recs
    auth.uid() = user_id 
    OR 
    -- User can see friends' saved_recs that are marked as visible to friends
    (
      visibility = 'friends' 
      AND 
      user_id IN (
        SELECT friend_id FROM active_friendships WHERE user_id = auth.uid()
      )
    )
  );

-- Ensure users can still manage their own saved_recs (drop and recreate to avoid conflicts)
DROP POLICY IF EXISTS "Users can insert own saved_recs" ON saved_recs;
DROP POLICY IF EXISTS "Users can update own saved_recs" ON saved_recs;
DROP POLICY IF EXISTS "Users can delete own saved_recs" ON saved_recs;

CREATE POLICY "Users can insert own saved_recs" ON saved_recs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved_recs" ON saved_recs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved_recs" ON saved_recs
  FOR DELETE USING (auth.uid() = user_id);

-- Also ensure profiles are readable by authenticated users for friend discovery
-- (This should already exist, but let's make sure)
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON profiles;
CREATE POLICY "Authenticated users can read profiles" ON profiles
  FOR SELECT TO authenticated USING (true);

-- Allow users to update their own profiles
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can manage their own profile" ON profiles;
CREATE POLICY "Users can manage their own profile" ON profiles
  FOR ALL USING (id = auth.uid());

-- Test the setup by verifying tables and views exist
-- (These are SQL comments, but you can uncomment to test)
-- SELECT COUNT(*) FROM profiles; -- Should return number of profiles
-- SELECT COUNT(*) FROM friendships; -- Should return number of friendship records  
-- SELECT COUNT(*) FROM active_friendships; -- Should return accepted friendships (bidirectional)

-- Example query to test friend places visibility:
-- SELECT sr.*, r.name as restaurant_name, p.display_name as owner_name
-- FROM saved_recs sr
-- JOIN restaurants r ON sr.restaurant_id = r.id  
-- JOIN profiles p ON sr.user_id = p.id
-- WHERE sr.visibility = 'friends'
--   AND sr.user_id IN (
--     SELECT friend_id FROM active_friendships WHERE user_id = auth.uid()
--   );

-- Grant execute permissions on the helper function to authenticated users
GRANT EXECUTE ON FUNCTION are_friends(UUID, UUID) TO authenticated;

-- Optional: Create a simplified function to get a specific friend's places
CREATE OR REPLACE FUNCTION get_specific_friend_places(friend_user_id UUID)
RETURNS TABLE(
  saved_rec_id UUID,
  restaurant_id UUID,
  restaurant_name TEXT,
  address TEXT,
  rating FLOAT4,
  price_level INTEGER,
  user_notes TEXT,
  tags TEXT[],
  is_public_tags BOOLEAN,
  created_at TIMESTAMP,
  latitude FLOAT8,
  longitude FLOAT8,
  phone TEXT,
  website TEXT
) 
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT 
    sr.id as saved_rec_id,
    r.id as restaurant_id,
    r.name as restaurant_name,
    r.address,
    r.rating,
    r.price_level,
    sr.user_notes,
    sr.tags,
    sr.is_public_tags,
    sr.created_at,
    r.latitude,
    r.longitude,
    r.phone,
    r.website
  FROM saved_recs sr
  JOIN restaurants r ON sr.restaurant_id = r.id
  WHERE sr.user_id = friend_user_id
    AND sr.visibility = 'friends'
    AND are_friends(auth.uid(), friend_user_id)
  ORDER BY sr.created_at DESC;
$$;

-- Grant execution permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_specific_friend_places(UUID) TO authenticated;

-- Summary of what this script does:
-- ✅ Allows friends to see each other's saved places marked as 'friends' visibility
-- ✅ Maintains privacy - only friends can see friend-visible places
-- ✅ Users can still only edit/delete their own places
-- ✅ Provides helper function for easy friend places querying
-- ✅ Maintains all existing functionality while adding social features 