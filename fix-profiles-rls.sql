-- Add RLS policies for profiles table to enable friends functionality

-- Allow authenticated users to read all profiles (for friend search)
CREATE POLICY "Allow authenticated users to read all profiles" ON profiles
    FOR SELECT 
    USING (auth.role() = 'authenticated');

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE 
    USING (auth.uid() = id);

-- Allow users to insert their own profile  
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- Allow users to read their own profile (fallback)
CREATE POLICY "Users can read own profile" ON profiles
    FOR SELECT 
    USING (auth.uid() = id);

-- Test the policies work
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'profiles'; 