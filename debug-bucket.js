import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yfslnblnkwarykdobznf.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlmc2xuYmxua3dhcnlrZG9iem5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyNjkyMDAsImV4cCI6MjA2NDg0NTIwMH0.Rnwp1PrnC93U4mKOJ26aEW4VVOZ_gZ7gP9vHpb8o8xg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugBucket() {
  try {
    console.log('🔍 Checking bucket status...')
    
    // List all buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('❌ Failed to list buckets:', listError.message)
      console.error('Full error:', listError)
      return
    }
    
    console.log('📋 All buckets in your project:')
    if (buckets.length === 0) {
      console.log('   No buckets found!')
    } else {
      buckets.forEach(bucket => {
        console.log(`   - ${bucket.name} (${bucket.public ? 'PUBLIC' : 'PRIVATE'})`)
      })
    }
    
    // Check specifically for our bucket
    const targetBucket = buckets.find(bucket => bucket.name === 'restaurant-screenshots')
    
    if (targetBucket) {
      console.log('✅ Found "restaurant-screenshots" bucket!')
      console.log(`   Public: ${targetBucket.public}`)
      console.log(`   ID: ${targetBucket.id}`)
      
      // Try to test upload access
      console.log('🧪 Testing upload access...')
      const testFile = new Blob(['test'], { type: 'text/plain' })
      const { data, error } = await supabase.storage
        .from('restaurant-screenshots')
        .upload('test.txt', testFile)
      
      if (error) {
        console.error('❌ Upload test failed:', error.message)
      } else {
        console.log('✅ Upload test successful!')
        // Clean up test file
        await supabase.storage.from('restaurant-screenshots').remove(['test.txt'])
      }
      
    } else {
      console.log('❌ "restaurant-screenshots" bucket NOT found!')
      console.log('💡 Try creating it again with exact name: restaurant-screenshots')
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }
}

debugBucket() 