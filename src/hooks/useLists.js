import { useState, useEffect } from 'react'

export function useLists(supabase, userId) {
  const [lists, setLists] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchLists = async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('lists')
        .select(`
          *,
          list_places(id)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      setLists(data || [])
    } catch (err) {
      console.error('Error fetching lists:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const createList = async (listData) => {
    if (!userId) throw new Error('No user ID provided')

    try {
      const { data, error } = await supabase
        .from('lists')
        .insert([
          {
            ...listData,
            owner_id: userId
          }
        ])
        .select()

      if (error) throw error

      // Add to local state
      setLists(prev => [data[0], ...prev])
      return data[0]
    } catch (err) {
      console.error('Error creating list:', err)
      throw err
    }
  }

  const updateList = async (listId, updates) => {
    try {
      const { data, error } = await supabase
        .from('lists')
        .update(updates)
        .eq('id', listId)
        .eq('owner_id', userId) // Security check
        .select()

      if (error) throw error

      // Update local state
      setLists(prev => prev.map(list => 
        list.id === listId ? { ...list, ...data[0] } : list
      ))
      return data[0]
    } catch (err) {
      console.error('Error updating list:', err)
      throw err
    }
  }

  const deleteList = async (listId) => {
    try {
      const { error } = await supabase
        .from('lists')
        .delete()
        .eq('id', listId)
        .eq('owner_id', userId) // Security check

      if (error) throw error

      // Remove from local state
      setLists(prev => prev.filter(list => list.id !== listId))
    } catch (err) {
      console.error('Error deleting list:', err)
      throw err
    }
  }

  useEffect(() => {
    fetchLists()
  }, [userId])

  return {
    lists,
    loading,
    error,
    fetchLists,
    createList,
    updateList,
    deleteList
  }
} 