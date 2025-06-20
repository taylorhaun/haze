-- Fix foreign key relationships for friendships table
-- This allows Supabase to understand how to join friendships with profiles

-- Add foreign key constraints
ALTER TABLE friendships 
ADD CONSTRAINT friendships_requester_id_fkey 
FOREIGN KEY (requester_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE friendships 
ADD CONSTRAINT friendships_addressee_id_fkey 
FOREIGN KEY (addressee_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Also fix any missing foreign keys on other tables
-- Make sure profiles references auth.users
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Verify the relationships work
SELECT 
  tc.table_name, 
  tc.constraint_name, 
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('friendships', 'profiles')
ORDER BY tc.table_name; 