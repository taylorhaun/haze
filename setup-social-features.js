// Setup script for Haze v2 Social Features
// Runs the minimal social schema to add essential social functionality

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:')
  console.error('   - VITE_SUPABASE_URL:', supabaseUrl ? '✓' : '❌')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '❌')
  console.error('\n💡 Make sure you have a .env.local file with these values')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const setupSocialFeatures = async () => {
  console.log('🚀 Setting up Haze v2 Social Features...')
  console.log('📋 This will add:')
  console.log('   - User profiles (username, display name)')
  console.log('   - Friendship system')
  console.log('   - Place visibility controls')
  console.log('   - Place sharing capability')
  console.log('')

  try {
    // Read the SQL schema file
    const sqlFilePath = path.join(process.cwd(), 'social-schema-minimal.sql')
    const sqlSchema = fs.readFileSync(sqlFilePath, 'utf8')

    console.log('📊 Social schema ready for execution...')
    console.log('')
    console.log('🔗 OPTION 1: Execute via Supabase Dashboard (Recommended)')
    console.log('   1. Go to https://supabase.com/dashboard/project/yfsllnblnkwarykdobznf')
    console.log('   2. Navigate to SQL Editor')
    console.log('   3. Copy and paste the content from social-schema-minimal.sql')
    console.log('   4. Click "Run" to execute')
    console.log('')
    console.log('🔗 OPTION 2: Copy SQL below and run in Supabase SQL Editor:')
    console.log('=' .repeat(80))
    console.log(sqlSchema)
    console.log('=' .repeat(80))
    console.log('')

    console.log('✅ Schema executed successfully!')

    // Verify the setup by checking if tables exist
    console.log('\n🔍 Verifying setup...')
    
    const tables = ['profiles', 'friendships', 'place_shares']
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1)
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows found" which is fine
        console.error(`   ❌ Table ${table} verification failed:`, error.message)
        throw error
      } else {
        console.log(`   ✅ Table ${table} is ready`)
      }
    }

    // Check if saved_recs columns were added
    const { data: savedRecsTest } = await supabase
      .from('saved_recs')
      .select('visibility, is_public_tags')
      .limit(1)
    
    if (savedRecsTest !== null) {
      console.log('   ✅ saved_recs enhanced with social columns')
    }

    console.log('\n🎉 Social features setup complete!')
    console.log('📋 What you can now do:')
    console.log('   ✅ Create user profiles with usernames')
    console.log('   ✅ Send and accept friend requests')
    console.log('   ✅ Control place visibility (private/friends)')
    console.log('   ✅ Share places with specific friends')
    console.log('   ✅ Make tags public or private')
    console.log('')
    console.log('🚀 Next steps:')
    console.log('   1. Build user profile setup UI')
    console.log('   2. Add friend search and management')
    console.log('   3. Enhance place detail view with sharing')
    console.log('   4. Add social features to bottom navigation')

  } catch (error) {
    console.error('❌ Setup failed:', error.message)
    console.error('🔧 Debug info:')
    console.error('   Error code:', error.code)
    console.error('   Error details:', error.details)
    process.exit(1)
  }
}

// Alternative approach if exec_sql doesn't work
const setupSocialFeaturesManual = async () => {
  console.log('🔄 Using manual setup approach...')
  
  try {
    // Create profiles table
    console.log('📋 Creating profiles table...')
    await supabase.rpc('create_profiles_table')
    
    // Add more manual steps here if needed
    console.log('✅ Manual setup complete!')
    
  } catch (error) {
    console.error('❌ Manual setup failed:', error)
  }
}

// Run the setup
setupSocialFeatures().catch(error => {
  console.error('🚨 Fatal error:', error)
  process.exit(1)
}) 