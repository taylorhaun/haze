// Setup script to add friend visibility policies to Supabase
// This enables friends to view each other's saved places

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:')
  console.error('   VITE_SUPABASE_URL:', supabaseUrl ? '✓' : '❌')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '❌')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const setupFriendVisibility = async () => {
  console.log('🔒 Setting up friend visibility policies...')
  console.log('')

  try {
    // Read the SQL schema file
    const sqlFilePath = path.join(process.cwd(), 'setup-friend-visibility.sql')
    const sqlSchema = fs.readFileSync(sqlFilePath, 'utf8')

    console.log('📊 Friend visibility SQL ready for execution...')
    console.log('')
    console.log('🔗 OPTION 1: Execute via Supabase Dashboard (Recommended)')
    console.log('   1. Go to https://supabase.com/dashboard/project/[your-project-id]')
    console.log('   2. Navigate to SQL Editor')
    console.log('   3. Copy and paste the content from setup-friend-visibility.sql')
    console.log('   4. Click "Run" to execute')
    console.log('')
    console.log('🔗 OPTION 2: Copy SQL below and run in Supabase SQL Editor:')
    console.log('=' .repeat(80))
    console.log(sqlSchema)
    console.log('=' .repeat(80))
    console.log('')

    console.log('✅ Friend visibility policies ready to execute!')
    console.log('')
    console.log('📋 What this will enable:')
    console.log('   ✅ Friends can view each other\'s saved places (visibility="friends")')
    console.log('   ✅ Privacy maintained - only accepted friends can see places')
    console.log('   ✅ Users can still only edit/delete their own places')
    console.log('   ✅ New helper function: get_specific_friend_places()')
    console.log('   ✅ View-only mode for friend places in RestaurantDetail')
    console.log('')
    console.log('🚀 After running the SQL, the "View Places" buttons will work!')

  } catch (error) {
    console.error('❌ Error setting up friend visibility:', error.message)
    throw error
  }
}

// Run the setup
setupFriendVisibility().catch(console.error) 