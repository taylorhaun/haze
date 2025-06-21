-- Fix usernames to remove email-like format
-- Convert from "madisoncorly_at_gmail.com" to "madisoncorly"

UPDATE profiles 
SET username = SPLIT_PART(username, '_at_', 1)
WHERE username LIKE '%_at_%';

-- Verify the changes
SELECT id, username, display_name 
FROM profiles 
ORDER BY username; 