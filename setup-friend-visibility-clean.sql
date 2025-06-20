-- Friend Visibility Policies for Saved Places
-- Execute this in Supabase SQL Editor

-- Step 1: Update saved_recs policies
DROP POLICY IF EXISTS "Users can view own saved_recs" ON saved_recs;
DROP POLICY IF EXISTS "Users can insert own saved_recs" ON saved_recs;
DROP POLICY IF EXISTS "Users can update own saved_recs" ON saved_recs;
DROP POLICY IF EXISTS "Users can delete own saved_recs" ON saved_recs;

-- New policy: Allow users to see their own places + friends' places
CREATE POLICY "Users can view accessible saved_recs" ON saved_recs
  FOR SELECT USING (
    auth.uid() = user_id 
    OR 
    (
      visibility = 'friends' 
      AND 
      user_id IN (
        SELECT friend_id FROM active_friendships WHERE user_id = auth.uid()
      )
    )
  );

-- Recreate management policies
CREATE POLICY "Users can insert own saved_recs" ON saved_recs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved_recs" ON saved_recs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved_recs" ON saved_recs
  FOR DELETE USING (auth.uid() = user_id);

-- Step 2: Ensure profiles are readable
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON profiles;
CREATE POLICY "Authenticated users can read profiles" ON profiles
  FOR SELECT TO authenticated USING (true);

-- Step 3: Allow profile management
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can manage their own profile" ON profiles;
CREATE POLICY "Users can manage their own profile" ON profiles
  FOR ALL USING (id = auth.uid());

-- Step 4: Grant function permissions
GRANT EXECUTE ON FUNCTION are_friends(UUID, UUID) TO authenticated; 