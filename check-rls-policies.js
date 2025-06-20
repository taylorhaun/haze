import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

// Service role client (has full access)
const supabaseService = createClient(supabaseUrl, supabaseServiceKey)

// Client-side client (what the browser uses)
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)

async function checkPermissions() {
  console.log('🔍 Checking RLS policies and permissions...')
  
  // Test 1: Check if service role can read profiles
  console.log('\n1️⃣ Testing service role access:')
  const { data: serviceProfiles, error: serviceError } = await supabaseService
    .from('profiles')
    .select('id, username, display_name')
    .limit(3)
    
  if (serviceError) {
    console.error('❌ Service role error:', serviceError)
  } else {
    console.log(`✅ Service role can read ${serviceProfiles.length} profiles`)
  }
  
  // Test 2: Check if client can read profiles (without auth)
  console.log('\n2️⃣ Testing client access (no auth):')
  const { data: clientProfiles, error: clientError } = await supabaseClient
    .from('profiles')
    .select('id, username, display_name')
    .limit(3)
    
  if (clientError) {
    console.error('❌ Client error (no auth):', clientError)
  } else {
    console.log(`✅ Client can read ${clientProfiles.length} profiles (no auth)`)
  }
  
  // Test 3: Check what RLS policies exist
  console.log('\n3️⃣ Checking RLS policies on profiles table:')
  const { data: policies, error: policyError } = await supabaseService
    .from('pg_policies')
    .select('*')
    .eq('tablename', 'profiles')
    
  if (policyError) {
    console.error('❌ Policy query error:', policyError)
  } else {
    console.log(`Found ${policies.length} RLS policies:`)
    policies.forEach(policy => {
      console.log(`  - ${policy.policyname}: ${policy.cmd} for ${policy.roles}`)
      console.log(`    Expression: ${policy.qual}`)
    })
  }
  
  // Test 4: Check if RLS is enabled
  console.log('\n4️⃣ Checking if RLS is enabled on profiles:')
  const { data: tableInfo, error: tableError } = await supabaseService
    .from('pg_class')
    .select('relname, relrowsecurity')
    .eq('relname', 'profiles')
    
  if (tableError) {
    console.error('❌ Table info error:', tableError)
  } else if (tableInfo[0]) {
    console.log(`RLS enabled: ${tableInfo[0].relrowsecurity}`)
  }
  
  console.log('\n💡 Solution:')
  console.log('If client access fails, we need to either:')
  console.log('  1. Add RLS policy to allow reading profiles')
  console.log('  2. Or use service role for profile queries in the backend')
}

checkPermissions().catch(console.error) 