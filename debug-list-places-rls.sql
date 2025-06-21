-- DEBUG SCRIPT FOR LIST_PLACES RLS ISSUES
-- Run this in Supabase SQL Editor to debug the problem

-- Step 1: Check what policies currently exist
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'list_places'
ORDER BY policyname;

-- Step 2: Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'list_places';

-- Step 3: Check the table structure (using standard SQL instead of \d)
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'list_places'
ORDER BY ordinal_position;

-- Step 4: Check if the trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'list_places';

-- Step 5: Test if we can see lists (this should work)
SELECT id, name, owner_id FROM lists LIMIT 5;

-- Step 6: Check current user context
SELECT 
  auth.uid() as current_user_id,
  auth.role() as current_role;

-- Step 7: Test the policy logic manually
-- Replace 'YOUR_LIST_ID' with an actual list ID you own
-- SELECT 
--   'YOUR_LIST_ID' as list_id,
--   EXISTS(
--     SELECT 1 FROM lists 
--     WHERE id = 'YOUR_LIST_ID' 
--     AND owner_id = auth.uid()
--   ) as can_insert_check;

-- Step 8: Try a simple insert test (will fail but show us the exact error)
-- Replace with actual values:
-- INSERT INTO list_places (list_id, restaurant_id) 
-- VALUES ('YOUR_LIST_ID', 'YOUR_RESTAURANT_ID'); 