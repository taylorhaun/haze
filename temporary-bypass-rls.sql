-- TEMPORARY BYPASS FOR TESTING
-- This will temporarily disable RLS on list_places to let you use the app
-- while we debug the real issue

-- Temporarily disable RLS on list_places
ALTER TABLE list_places DISABLE ROW LEVEL SECURITY;

-- Note: This is NOT a permanent solution!
-- This removes all security restrictions on list_places
-- We'll re-enable it once we fix the policies properly

-- To re-enable later (don't run this now):
-- ALTER TABLE list_places ENABLE ROW LEVEL SECURITY; 