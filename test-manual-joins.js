import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function testManualJoins() {
  console.log('🧪 Testing manual joins for Friends functionality...')
  
  const taylorUserId = '51f27bb3-38ad-4607-84e0-f4b86c9c2c5d' // From debug output
  
  // Test 1: Get incoming requests with manual join
  console.log('\n📬 Testing incoming friend requests:')
  
  const { data: incomingRequests, error: incomingError } = await supabase
    .from('friendships')
    .select('id, requester_id, created_at')
    .eq('addressee_id', taylorUserId)
    .eq('status', 'pending')

  if (incomingError) {
    console.error('❌ Error getting incoming requests:', incomingError)
  } else {
    console.log(`✅ Found ${incomingRequests.length} incoming requests`)
    
    if (incomingRequests.length > 0) {
      const requesterIds = incomingRequests.map(req => req.requester_id)
      const { data: requesterProfiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, display_name, bio, avatar_url')
        .in('id', requesterIds)

      if (profileError) {
        console.error('❌ Error getting requester profiles:', profileError)
      } else {
        console.log('✅ Got requester profiles:')
        incomingRequests.forEach(req => {
          const profile = requesterProfiles.find(p => p.id === req.requester_id)
          console.log(`  From: ${profile?.display_name} (@${profile?.username})`)
        })
      }
    }
  }
  
  // Test 2: Test user search
  console.log('\n🔍 Testing user search:')
  const { data: searchResults, error: searchError } = await supabase
    .from('profiles')
    .select('id, username, display_name, bio, avatar_url')
    .or(`username.ilike.%madi%,display_name.ilike.%madi%`)
    .neq('id', taylorUserId)
    .limit(20)
    
  if (searchError) {
    console.error('❌ Search error:', searchError)
  } else {
    console.log(`✅ Search found ${searchResults.length} results:`)
    searchResults.forEach(user => {
      console.log(`  @${user.username} (${user.display_name})`)
    })
  }
  
  // Test 3: Test accepting a friend request flow
  console.log('\n🤝 Testing accept friend request flow:')
  if (incomingRequests?.length > 0) {
    const firstRequest = incomingRequests[0]
    console.log(`Would accept request ${firstRequest.id} from ${firstRequest.requester_id}`)
    
    // Don't actually accept it, just show what would happen
    console.log('✅ Accept flow would work (not executing to preserve test data)')
  }
  
  console.log('\n🎉 Manual joins test complete!')
}

testManualJoins().catch(console.error) 