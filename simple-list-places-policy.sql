-- SIMPLE LIST_PLACES POLICY
-- This creates the most basic policy that should work

-- Step 1: Drop all existing policies
DROP POLICY IF EXISTS "list_places_select_policy" ON list_places;
DROP POLICY IF EXISTS "list_places_insert_policy" ON list_places;
DROP POLICY IF EXISTS "list_places_update_policy" ON list_places;
DROP POLICY IF EXISTS "list_places_delete_policy" ON list_places;

-- Step 2: Create the simplest possible policies
-- Allow authenticated users to do everything (we'll restrict later)
CREATE POLICY "authenticated_users_can_select_list_places" ON list_places
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_users_can_insert_list_places" ON list_places
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated_users_can_update_list_places" ON list_places
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "authenticated_users_can_delete_list_places" ON list_places
  FOR DELETE TO authenticated USING (true);

-- Step 3: Ensure RLS is enabled
ALTER TABLE list_places ENABLE ROW LEVEL SECURITY;

-- Step 4: Keep the trigger for added_by
CREATE OR REPLACE FUNCTION set_added_by_user()
RETURNS TRIGGER AS $$
BEGIN
  NEW.added_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS set_added_by_trigger ON list_places;
CREATE TRIGGER set_added_by_trigger
  BEFORE INSERT ON list_places
  FOR EACH ROW
  EXECUTE FUNCTION set_added_by_user(); 