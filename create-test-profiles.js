import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!')
  console.log('VITE_SUPABASE_URL:', supabaseUrl ? '✓' : '❌')
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '❌')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createTestProfiles() {
  console.log('🔍 Checking existing auth users...')
  
  // Get all auth users
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
  
  if (usersError) {
    console.error('❌ Error fetching users:', usersError)
    return
  }
  
  console.log(`📊 Found ${users.users.length} auth users:`)
  users.users.forEach(user => {
    console.log(`  - ${user.email} (ID: ${user.id})`)
  })
  
  // Check existing profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
  
  if (profilesError) {
    console.error('❌ Error fetching profiles:', profilesError)
    return
  }
  
  console.log(`\n📋 Found ${profiles.length} existing profiles:`)
  profiles.forEach(profile => {
    console.log(`  - @${profile.username} (${profile.display_name})`)
  })
  
  // Find users without profiles
  const profileUserIds = new Set(profiles.map(p => p.id))
  const usersWithoutProfiles = users.users.filter(u => !profileUserIds.has(u.id))
  
  console.log(`\n🎯 Users without profiles: ${usersWithoutProfiles.length}`)
  
  // Create profiles for users without them
  const newProfiles = []
  
  for (const user of usersWithoutProfiles) {
    // Generate username from email
    const emailUsername = user.email.split('@')[0].toLowerCase()
    const username = emailUsername.replace(/[^a-z0-9_]/g, '_')
    const displayName = emailUsername.split('.').map(part => 
      part.charAt(0).toUpperCase() + part.slice(1)
    ).join(' ')
    
    let bio = ''
    if (user.email.includes('madi')) {
      bio = '🍕 Pizza lover & foodie explorer'
    } else if (user.email.includes('test')) {
      bio = '🧪 Test user for trying out new features'
    }
    
    newProfiles.push({
      id: user.id,
      username: username,
      display_name: displayName,
      bio: bio
    })
  }
  
  // Also create a dedicated test user profile if none exists
  const testUser = users.users.find(u => u.email.includes('test'))
  if (!testUser) {
    console.log('\n⚠️  No test user found. You can create one manually in Supabase Auth.')
  }
  
  if (newProfiles.length > 0) {
    console.log(`\n✨ Creating ${newProfiles.length} new profiles:`)
    newProfiles.forEach(profile => {
      console.log(`  - @${profile.username} (${profile.display_name})`)
    })
    
    const { data: insertedProfiles, error: insertError } = await supabase
      .from('profiles')
      .insert(newProfiles)
      .select()
    
    if (insertError) {
      console.error('❌ Error creating profiles:', insertError)
      return
    }
    
    console.log('✅ Successfully created profiles!')
  } else {
    console.log('\n✅ All users already have profiles!')
  }
  
  // Create some sample friend connections for testing
  console.log('\n🤝 Setting up test friendships...')
  
  // Get Taylor's profile
  const taylorProfile = profiles.find(p => p.username.includes('taylorhaun'))
  
  if (taylorProfile && newProfiles.length > 0) {
    // Create friend requests between Taylor and new users
    const friendRequests = newProfiles.map(profile => ({
      requester_id: profile.id,
      addressee_id: taylorProfile.id,
      status: 'pending'
    }))
    
    const { error: friendError } = await supabase
      .from('friendships')
      .insert(friendRequests)
    
    if (friendError) {
      console.error('❌ Error creating friend requests:', friendError)
    } else {
      console.log(`✅ Created ${friendRequests.length} pending friend requests to Taylor`)
    }
  }
  
  console.log('\n🎉 Test setup complete!')
  console.log('\n📱 Now you can test:')
  console.log('  1. Go to Friends tab in the app')
  console.log('  2. Check "📬 Requests" tab for incoming requests')
  console.log('  3. Try searching for usernames in "🔍 Search" tab')
  console.log('  4. Accept/decline friend requests')
}

createTestProfiles().catch(console.error) 