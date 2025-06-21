// TEST AUTHENTICATION CONTEXT
// Run this in your browser console while logged into the app

// Test 1: Check if user is authenticated
console.log('=== AUTH TEST ===')
console.log('Current user:', window.supabase?.auth?.getUser())

// Test 2: Try a simple authenticated query
window.supabase?.auth?.getUser().then(({ data: { user } }) => {
  console.log('User from getUser():', user)
  if (user) {
    console.log('User ID:', user.id)
    console.log('User email:', user.email)
    
    // Test 3: Try to query lists (should work)
    return window.supabase
      .from('lists')
      .select('id, name, owner_id')
      .limit(3)
  }
}).then(result => {
  if (result) {
    console.log('Lists query result:', result)
  }
}).catch(error => {
  console.error('Error:', error)
})

// Test 4: Try to insert into list_places (will likely fail)
// Replace with your actual list_id and restaurant_id
// window.supabase
//   .from('list_places')
//   .insert([{ list_id: 'YOUR_LIST_ID', restaurant_id: 'YOUR_RESTAURANT_ID' }])
//   .then(result => console.log('Insert result:', result))
//   .catch(error => console.error('Insert error:', error)) 