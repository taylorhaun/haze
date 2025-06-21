// Common Supabase helper functions

export const handleSupabaseError = (error, fallbackMessage = 'An error occurred') => {
  console.error('Supabase error:', error)
  return error?.message || fallbackMessage
}

export const withErrorHandling = async (asyncFn, errorMessage) => {
  try {
    return await asyncFn()
  } catch (error) {
    const message = handleSupabaseError(error, errorMessage)
    throw new Error(message)
  }
}

// Restaurant/Places helpers
export const fetchUserRestaurants = async (supabase, userId) => {
  return withErrorHandling(async () => {
    const { data, error } = await supabase
      .from('saved_recs')
      .select(`
        *,
        restaurants (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }, 'Failed to fetch restaurants')
}

export const deleteRestaurant = async (supabase, savedRecId, userId) => {
  return withErrorHandling(async () => {
    const { error } = await supabase
      .from('saved_recs')
      .delete()
      .eq('id', savedRecId)
      .eq('user_id', userId) // Security check

    if (error) throw error
  }, 'Failed to delete restaurant')
}

// Profile helpers
export const fetchUserProfile = async (supabase, userId) => {
  return withErrorHandling(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }, 'Failed to fetch profile')
}

export const updateUserProfile = async (supabase, userId, updates) => {
  return withErrorHandling(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  }, 'Failed to update profile')
}

// Friends helpers
export const fetchFriends = async (supabase, userId) => {
  return withErrorHandling(async () => {
    // Get accepted friendships
    const { data: friendships, error } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id, created_at')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)

    if (error) throw error
    if (!friendships?.length) return []

    // Get friend IDs
    const friendIds = friendships.map(friendship => 
      friendship.requester_id === userId 
        ? friendship.addressee_id 
        : friendship.requester_id
    )

    // Get friend profiles
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, display_name, bio, avatar_url')
      .in('id', friendIds)

    if (profileError) throw profileError

    // Combine data
    return friendships.map(friendship => ({
      friend_id: friendship.requester_id === userId 
        ? friendship.addressee_id 
        : friendship.requester_id,
      friendship_date: friendship.created_at,
      profile: profiles.find(p => p.id === (
        friendship.requester_id === userId 
          ? friendship.addressee_id 
          : friendship.requester_id
      ))
    }))
  }, 'Failed to fetch friends')
}

export const sendFriendRequest = async (supabase, fromUserId, toUserId) => {
  return withErrorHandling(async () => {
    const { data, error } = await supabase
      .from('friendships')
      .insert([{
        requester_id: fromUserId,
        addressee_id: toUserId,
        status: 'pending',
      }])
      .select()
      .single()

    if (error) throw error
    return data
  }, 'Failed to send friend request')
}

// List helpers
export const fetchUserLists = async (supabase, userId) => {
  return withErrorHandling(async () => {
    const { data, error } = await supabase
      .from('lists')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }, 'Failed to fetch lists')
}

export const createList = async (supabase, listData) => {
  return withErrorHandling(async () => {
    const { data, error } = await supabase
      .from('lists')
      .insert([listData])
      .select()
      .single()

    if (error) throw error
    return data
  }, 'Failed to create list')
}

// Search helpers
export const searchUsers = async (supabase, query, currentUserId, limit = 20) => {
  return withErrorHandling(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, bio, avatar_url')
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .neq('id', currentUserId)
      .limit(limit)

    if (error) throw error
    return data || []
  }, 'Failed to search users')
} 