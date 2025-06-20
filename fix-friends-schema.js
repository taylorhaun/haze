import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixSchema() {
  console.log('🔧 Fixing foreign key relationships...')
  
  const sql = fs.readFileSync('fix-foreign-keys.sql', 'utf8')
  
  console.log('\n📝 SQL to execute:')
  console.log('='.repeat(50))
  console.log(sql)
  console.log('='.repeat(50))
  
  console.log('\n⚠️  Please copy the SQL above and execute it in the Supabase SQL Editor')
  console.log('   1. Go to Supabase Dashboard → SQL Editor')
  console.log('   2. Paste the SQL above')
  console.log('   3. Click "Run"')
  console.log('\n   This will add the missing foreign key relationships.')
  
  // Let's also test if we can query the relationships after fixing
  console.log('\n🧪 After fixing, test this query to verify it works:')
  console.log(`
SELECT f.*, 
       p1.username as requester_username,
       p1.display_name as requester_name,
       p2.username as addressee_username,
       p2.display_name as addressee_name
FROM friendships f
JOIN profiles p1 ON f.requester_id = p1.id
JOIN profiles p2 ON f.addressee_id = p2.id
WHERE f.status = 'pending'
LIMIT 5;
  `)
}

fixSchema().catch(console.error) 