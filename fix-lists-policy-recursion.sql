-- Fix infinite recursion in lists policy
-- The issue is that the SELECT policy references list_collaborators which then references lists

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view accessible lists" ON lists;

-- Create a simpler policy that doesn't cause recursion
CREATE POLICY "Users can view accessible lists" ON lists
  FOR SELECT USING (
    -- Users can see their own lists
    owner_id = auth.uid() 
    OR 
    -- Users can see public lists
    is_public = true
  );

-- We'll handle collaborative access through a separate approach if needed
-- For now, let's keep it simple to avoid recursion 