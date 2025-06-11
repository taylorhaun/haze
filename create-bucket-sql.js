import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yfslnblnkwarykdobznf.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlmc2xuYmxua3dhcnlrZG9iem5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyNjkyMDAsImV4cCI6MjA2NDg0NTIwMH0.Rnwp1PrnC93U4mKOJ26aEW4VVOZ_gZ7gP9vHpb8o8xg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function createBucketSQL() {
  try {
    console.log('🚀 Creating bucket via SQL...')
    
    // Check if storage schema exists
    const { data: schemas, error: schemaError } = await supabase
      .rpc('get_schemas')
      .single()
    
    if (schemaError) {
      console.log('📝 Storage schema check failed (this is normal):', schemaError.message)
    }
    
    // Try to create bucket using RPC
    const { data, error } = await supabase
      .rpc('create_storage_bucket', {
        bucket_name: 'restaurant-screenshots',
        is_public: true
      })
    
    if (error) {
      console.error('❌ SQL bucket creation failed:', error.message)
      console.log('\n💡 Manual steps:')
      console.log('1. Go to: https://app.supabase.com/project/yfslnblnkwarykdobznf/storage/buckets')
      console.log('2. If Storage is disabled, click "Enable Storage"')
      console.log('3. Click "Create Bucket"')
      console.log('4. Name: restaurant-screenshots')
      console.log('5. ✅ Check "Public bucket"')
      console.log('6. Click "Create"')
    } else {
      console.log('✅ Bucket created successfully!')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.log('\n💡 Storage might not be enabled. Try:')
    console.log('https://app.supabase.com/project/yfslnblnkwarykdobznf/storage/buckets')
  }
}

createBucketSQL() 