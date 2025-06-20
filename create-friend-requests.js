import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createFriendRequests() {
  console.log('🤝 Setting up test friend requests...')
  
  // Get all profiles
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    
  if (error) {
    console.error('❌ Error fetching profiles:', error)
    return
  }
  
  // Find Taylor and Madi
  const taylorProfile = profiles.find(p => p.username.includes('taylorhaun'))
  const madiProfile = profiles.find(p => p.username.includes('madisoncorly'))
  const bentProfile = profiles.find(p => p.username.includes('bentbianchi'))
  const mattProfile = profiles.find(p => p.username.includes('mattrenskers'))
  
  console.log('👤 Found profiles:')
  console.log(`  Taylor: @${taylorProfile?.username}`)
  console.log(`  Madi: @${madiProfile?.username}`)
  console.log(`  Bent: @${bentProfile?.username}`)
  console.log(`  Matt: @${mattProfile?.username}`)
  
  // Check existing friendships
  const { data: existingFriendships, error: friendError } = await supabase
    .from('friendships')
    .select('*')
    
  if (friendError) {
    console.error('❌ Error fetching friendships:', friendError)
    return
  }
  
  console.log(`\n📊 Found ${existingFriendships.length} existing friendships/requests`)
  
  // Create friend requests to Taylor
  const friendRequests = []
  
  if (madiProfile && taylorProfile) {
    friendRequests.push({
      requester_id: madiProfile.id,
      addressee_id: taylorProfile.id,
      status: 'pending'
    })
  }
  
  if (bentProfile && taylorProfile) {
    friendRequests.push({
      requester_id: bentProfile.id,
      addressee_id: taylorProfile.id,
      status: 'pending'
    })
  }
  
  if (mattProfile && taylorProfile) {
    friendRequests.push({
      requester_id: mattProfile.id,
      addressee_id: taylorProfile.id,
      status: 'pending'
    })
  }
  
  // Filter out requests that already exist
  const existingPairs = new Set(
    existingFriendships.map(f => `${f.requester_id}-${f.addressee_id}`)
  )
  
  const newRequests = friendRequests.filter(req => 
    !existingPairs.has(`${req.requester_id}-${req.addressee_id}`) &&
    !existingPairs.has(`${req.addressee_id}-${req.requester_id}`)
  )
  
  if (newRequests.length > 0) {
    console.log(`\n✨ Creating ${newRequests.length} new friend requests:`)
    newRequests.forEach(req => {
      const requester = profiles.find(p => p.id === req.requester_id)
      const addressee = profiles.find(p => p.id === req.addressee_id)
      console.log(`  ${requester.display_name} → ${addressee.display_name}`)
    })
    
    const { error: insertError } = await supabase
      .from('friendships')
      .insert(newRequests)
    
    if (insertError) {
      console.error('❌ Error creating friend requests:', insertError)
      return
    }
    
    console.log('✅ Successfully created friend requests!')
  } else {
    console.log('\n✅ All friend requests already exist!')
  }
  
  console.log('\n🎉 Test setup complete!')
  console.log('\n📱 Now test in the app:')
  console.log('  1. Go to Friends tab (👥)')
  console.log('  2. Check "📬 Requests" tab - you should see incoming requests!')
  console.log('  3. Accept/decline the requests')
  console.log('  4. Try searching for: madi, bent, matt, etc.')
  console.log('  5. Send friend requests to other users')
}

createFriendRequests().catch(console.error) 