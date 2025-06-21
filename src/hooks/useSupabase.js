import { useState, useEffect, useCallback } from 'react'

// Generic hook for data fetching with consistent loading/error states
export function useSupabaseQuery(queryFn, dependencies = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await queryFn()
      setData(result)
    } catch (err) {
      console.error('Supabase query error:', err)
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, dependencies)

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  }
}

// Hook for mutations (create, update, delete)
export function useSupabaseMutation() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const mutate = useCallback(async (mutationFn) => {
    try {
      setLoading(true)
      setError(null)
      const result = await mutationFn()
      return result
    } catch (err) {
      console.error('Supabase mutation error:', err)
      setError(err.message || 'An error occurred')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    mutate,
    loading,
    error,
    clearError: () => setError(null),
  }
}

// Specific hook for restaurants
export function useRestaurants(supabase, userId) {
  return useSupabaseQuery(
    async () => {
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
    },
    [userId]
  )
}

// Specific hook for friends
export function useFriends(supabase, userId) {
  return useSupabaseQuery(
    async () => {
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
    },
    [userId]
  )
}

// Hook for user profile
export function useUserProfile(supabase, userId) {
  return useSupabaseQuery(
    async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data
    },
    [userId]
  )
} 