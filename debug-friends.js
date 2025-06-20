import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function debugFriends() {
  console.log('🔍 Debugging Friends functionality...')
  
  // 1. Check friend requests
  console.log('\n📬 Friend Requests:')
  const { data: requests, error: reqError } = await supabase
    .from('friendships')
    .select('*')
    
  if (reqError) {
    console.error('❌ Error fetching requests:', reqError)
  } else {
    console.log(`Found ${requests.length} friend requests:`)
    requests.forEach(req => {
      console.log(`  ${req.id}: ${req.requester_id} -> ${req.addressee_id} (${req.status})`)
    })
  }
  
  // 2. Check profiles
  console.log('\n👤 Profiles:')
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    
  if (profileError) {
    console.error('❌ Error fetching profiles:', profileError)
  } else {
    console.log(`Found ${profiles.length} profiles:`)
    profiles.forEach(p => {
      console.log(`  @${p.username} (${p.display_name}) - ID: ${p.id}`)
    })
  }
  
  // 3. Test the exact query that FriendsTab uses for incoming requests
  const taylorProfile = profiles?.find(p => p.username.includes('taylorhaun'))
  if (taylorProfile) {
    console.log(`\n🎯 Testing incoming requests for Taylor (${taylorProfile.id}):`)
    
    const { data: incomingRequests, error: incomingError } = await supabase
      .from('friendships')
      .select(`
        id,
        requester_id,
        created_at,
        profiles!requester_id (
          username,
          display_name,
          bio,
          avatar_url
        )
      `)
      .eq('addressee_id', taylorProfile.id)
      .eq('status', 'pending')
    
    if (incomingError) {
      console.error('❌ Error fetching incoming requests:', incomingError)
    } else {
      console.log(`Found ${incomingRequests.length} incoming requests:`)
      incomingRequests.forEach(req => {
        console.log(`  From: ${req.profiles.display_name} (@${req.profiles.username})`)
      })
    }
  }
  
  // 4. Test the active_friendships view
  console.log('\n🤝 Testing active_friendships view:')
  const { data: activeFriends, error: friendsError } = await supabase
    .from('active_friendships')
    .select('*')
    
  if (friendsError) {
    console.error('❌ Error fetching active friends:', friendsError)
    console.log('This might be why the friends list is empty!')
  } else {
    console.log(`Found ${activeFriends.length} active friendships`)
  }
  
  // 5. Test user search
  console.log('\n🔍 Testing user search for "madi":')
  const { data: searchResults, error: searchError } = await supabase
    .from('profiles')
    .select('id, username, display_name, bio, avatar_url')
    .or(`username.ilike.%madi%,display_name.ilike.%madi%`)
    .limit(20)
    
  if (searchError) {
    console.error('❌ Error searching users:', searchError)
  } else {
    console.log(`Found ${searchResults.length} search results:`)
    searchResults.forEach(user => {
      console.log(`  @${user.username} (${user.display_name})`)
    })
  }
}

debugFriends().catch(console.error) 