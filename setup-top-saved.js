// Setup script to create the top saved functionality in Supabase
// Run this script after updating your Supabase database

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your-supabase-url'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'your-service-key' // You'll need the service key for this

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const createTopSavedFunction = async () => {
  console.log('🏗️  Creating top saved database function...')
  
  const sql = `
    -- Create a secure function to get top saved restaurants
    CREATE OR REPLACE FUNCTION get_top_saved_restaurants(min_saves INTEGER DEFAULT 1)
    RETURNS TABLE (
      id UUID,
      name TEXT,
      address TEXT,
      latitude FLOAT8,
      longitude FLOAT8,
      rating FLOAT4,
      price_level INTEGER,
      save_count BIGINT,
      popular_tags TEXT[]
    ) 
    LANGUAGE SQL
    SECURITY DEFINER
    AS $$
      SELECT 
        r.id,
        r.name,
        r.address,
        r.latitude,
        r.longitude,
        r.rating,
        r.price_level,
        COUNT(DISTINCT sr.user_id) as save_count,
        ARRAY(
          SELECT DISTINCT unnest(sr_inner.tags) 
          FROM saved_recs sr_inner 
          WHERE sr_inner.restaurant_id = r.id 
          AND sr_inner.tags IS NOT NULL
          LIMIT 10
        ) as popular_tags
      FROM restaurants r
      INNER JOIN saved_recs sr ON r.id = sr.restaurant_id
      GROUP BY r.id, r.name, r.address, r.latitude, r.longitude, r.rating, r.price_level
      HAVING COUNT(DISTINCT sr.user_id) >= min_saves
      ORDER BY save_count DESC, r.rating DESC NULLS LAST
      LIMIT 50;
    $$;

    -- Grant execution permissions to authenticated users
    GRANT EXECUTE ON FUNCTION get_top_saved_restaurants(INTEGER) TO authenticated;
  `

  try {
    const { error } = await supabase.rpc('exec_sql', { sql })
    
    if (error) {
      console.error('❌ Error creating function:', error)
      console.log('\n📝 Manual setup required:')
      console.log('1. Go to your Supabase SQL Editor')
      console.log('2. Run the SQL from create-top-saved-function.sql')
      console.log('3. Or copy the SQL above')
      return false
    }

    console.log('✅ Top saved function created successfully!')
    return true
  } catch (err) {
    console.error('❌ Error:', err)
    console.log('\n📝 Manual setup required:')
    console.log('1. Go to your Supabase SQL Editor: https://supabase.com/dashboard/project/' + supabaseUrl.split('//')[1].split('.')[0] + '/sql')
    console.log('2. Run the SQL from create-top-saved-function.sql')
    return false
  }
}

const testFunction = async () => {
  console.log('🧪 Testing top saved function...')
  
  try {
    const { data, error } = await supabase.rpc('get_top_saved_restaurants', { min_saves: 1 })
    
    if (error) {
      console.error('❌ Function test failed:', error)
      return false
    }

    console.log('✅ Function test successful!')
    console.log(`📊 Found ${data.length} restaurants in top saved`)
    
    if (data.length > 0) {
      console.log('🎯 Sample result:', {
        name: data[0].name,
        save_count: data[0].save_count,
        popular_tags: data[0].popular_tags?.slice(0, 3)
      })
    }

    return true
  } catch (err) {
    console.error('❌ Test error:', err)
    return false
  }
}

const main = async () => {
  console.log('🚀 Setting up Top Saved feature...\n')
  
  // Check connection
  try {
    const { data, error } = await supabase.from('saved_recs').select('count', { count: 'exact', head: true })
    if (error) throw error
    console.log(`🔗 Connected to Supabase (${data} saved restaurants total)\n`)
  } catch (err) {
    console.error('❌ Cannot connect to Supabase:', err.message)
    console.log('💡 Make sure your VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY are correct')
    return
  }

  // Create function
  const functionCreated = await createTopSavedFunction()
  
  if (functionCreated) {
    // Test function
    await testFunction()
  }

  console.log('\n🎉 Setup complete! You can now use the Top Saved feature.')
  console.log('💡 Tip: Populate some test data by having multiple users save the same restaurants')
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { createTopSavedFunction, testFunction } 