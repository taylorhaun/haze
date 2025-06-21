-- COMPREHENSIVE FIX FOR LIST_PLACES RLS POLICIES
-- This will completely reset and fix the policies

-- Step 1: Drop ALL existing policies on list_places
DROP POLICY IF EXISTS "Collaborators can add places to lists" ON list_places;
DROP POLICY IF EXISTS "Users can add places to accessible lists" ON list_places;
DROP POLICY IF EXISTS "Users can view places in accessible lists" ON list_places;
DROP POLICY IF EXISTS "Users can update places they added" ON list_places;
DROP POLICY IF EXISTS "List owners and place adders can delete places" ON list_places;

-- Step 2: Temporarily disable RLS to test
ALTER TABLE list_places DISABLE ROW LEVEL SECURITY;

-- Step 3: Re-enable RLS
ALTER TABLE list_places ENABLE ROW LEVEL SECURITY;

-- Step 4: Create simple, working policies

-- SELECT policy - users can view places in lists they can access
CREATE POLICY "list_places_select_policy" ON list_places
  FOR SELECT USING (
    list_id IN (
      SELECT id FROM lists 
      WHERE owner_id = auth.uid() 
      OR is_public = true
    )
  );

-- INSERT policy - simplified to just allow list owners
CREATE POLICY "list_places_insert_policy" ON list_places
  FOR INSERT WITH CHECK (
    list_id IN (
      SELECT id FROM lists 
      WHERE owner_id = auth.uid()
    )
  );

-- UPDATE policy - users can update places they added
CREATE POLICY "list_places_update_policy" ON list_places
  FOR UPDATE USING (added_by = auth.uid());

-- DELETE policy - list owners and place adders can delete
CREATE POLICY "list_places_delete_policy" ON list_places
  FOR DELETE USING (
    added_by = auth.uid()
    OR
    list_id IN (
      SELECT id FROM lists 
      WHERE owner_id = auth.uid()
    )
  );

-- Step 5: Ensure the trigger function exists and works
CREATE OR REPLACE FUNCTION set_added_by_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Always set added_by to the current user
  NEW.added_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create the trigger
DROP TRIGGER IF EXISTS set_added_by_trigger ON list_places;
CREATE TRIGGER set_added_by_trigger
  BEFORE INSERT ON list_places
  FOR EACH ROW
  EXECUTE FUNCTION set_added_by_user();

-- Step 7: Test query to verify policies work
-- You can uncomment this to test:
-- SELECT 
--   schemaname,
--   tablename,
--   policyname,
--   permissive,
--   roles,
--   cmd,
--   qual
-- FROM pg_policies 
-- WHERE tablename = 'list_places'; 