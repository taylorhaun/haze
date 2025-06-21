-- Fix infinite recursion in list_collaborators policy
-- The issue is that the policy references list_collaborators within itself

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view collaborators of accessible lists" ON list_collaborators;

-- Create a simpler, non-recursive policy
CREATE POLICY "Users can view collaborators of accessible lists" ON list_collaborators
  FOR SELECT USING (
    -- Users can see collaborators of lists they own
    list_id IN (
      SELECT id FROM lists 
      WHERE owner_id = auth.uid()
    )
    OR
    -- Users can see collaborators of lists they are collaborating on
    user_id = auth.uid()
    OR
    -- Users can see collaborators of public lists
    list_id IN (
      SELECT id FROM lists 
      WHERE is_public = true
    )
  ); 