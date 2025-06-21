import React, { useState, useEffect } from 'react'
import { useLists } from '../hooks/useLists'
import CreateListPage from './features/lists/CreateListPage'

export default function Lists({ session, supabase, onClose, standalone = false }) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingList, setEditingList] = useState(null)
  
  // Use our custom hook for data fetching
  const { lists, loading, error, fetchLists } = useLists(supabase, session?.user?.id)

  const handleEditList = (list) => {
    setEditingList(list)
  }

  const handleListCreated = () => {
    setShowCreateModal(false)
    fetchLists() // Refresh the lists
  }

  const EditListModal = ({ list, onClose, onSave, onDelete }) => {
    const [listName, setListName] = useState(list.name)
    const [description, setDescription] = useState(list.description || '')
    const [isCollaborative, setIsCollaborative] = useState(list.is_public)
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)
    
    // Places management state
    const [listPlaces, setListPlaces] = useState([])
    const [allSavedPlaces, setAllSavedPlaces] = useState([])
    const [showAddPlaces, setShowAddPlaces] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [loadingPlaces, setLoadingPlaces] = useState(false)

    useEffect(() => {
      loadListPlaces()
      loadAllSavedPlaces()
    }, [])

    const loadListPlaces = async () => {
      try {
        const { data, error } = await supabase
          .from('list_places')
          .select(`
            id,
            restaurant_id,
            added_at,
            restaurants (
              id,
              name,
              address,
              cuisine_type,
              rating
            )
          `)
          .eq('list_id', list.id)
          .order('added_at', { ascending: false })

        if (error) throw error
        setListPlaces(data || [])
      } catch (error) {
        console.error('Error loading list places:', error)
      }
    }

    const loadAllSavedPlaces = async () => {
      setLoadingPlaces(true)
      try {
        const { data, error } = await supabase
          .from('saved_recs')
          .select(`
            id,
            restaurant_id,
            restaurants (
              id,
              name,
              address,
              cuisine_type,
              rating
            )
          `)
          .eq('user_id', session?.user?.id)
          .order('created_at', { ascending: false })

        if (error) throw error
        setAllSavedPlaces(data || [])
      } catch (error) {
        console.error('Error loading saved places:', error)
      } finally {
        setLoadingPlaces(false)
      }
    }

    const handleSubmit = async (e) => {
      e.preventDefault()
      if (!listName.trim()) return

      setSaving(true)
      try {
        const { data, error } = await supabase
          .from('lists')
          .update({
            name: listName.trim(),
            description: description.trim() || null,
            is_public: isCollaborative,
            updated_at: new Date().toISOString()
          })
          .eq('id', list.id)
          .select()

        if (error) throw error

        console.log('List updated successfully:', data[0])
        onSave()
        onClose()
      } catch (error) {
        console.error('Error updating list:', error)
        alert(`Failed to update list: ${error.message}`)
      } finally {
        setSaving(false)
      }
    }

    const handleDelete = async () => {
      if (!confirm('Are you sure you want to delete this list? This action cannot be undone.')) {
        return
      }

      setDeleting(true)
      try {
        const { error } = await supabase
          .from('lists')
          .delete()
          .eq('id', list.id)

        if (error) throw error

        console.log('List deleted successfully')
        onDelete()
        onClose()
      } catch (error) {
        console.error('Error deleting list:', error)
        alert(`Failed to delete list: ${error.message}`)
      } finally {
        setDeleting(false)
      }
    }

    const addPlaceToList = async (restaurant) => {
      try {
        // Check if already in list
        const existingPlace = listPlaces.find(place => place.restaurant_id === restaurant.id)
        if (existingPlace) {
          alert('This place is already in your list!')
          return
        }

        const { data, error } = await supabase
          .from('list_places')
          .insert([
            {
              list_id: list.id,
              restaurant_id: restaurant.id,
              added_by: session?.user?.id
            }
          ])
          .select(`
            id,
            restaurant_id,
            added_at,
            restaurants (
              id,
              name,
              address,
              cuisine_type,
              rating
            )
          `)

        if (error) throw error

        // Add to local state
        setListPlaces(prev => [data[0], ...prev])
        
        // Close search and clear query
        setShowAddPlaces(false)
        setSearchQuery('')
        
      } catch (error) {
        console.error('Error adding place to list:', error)
        alert(`Failed to add place: ${error.message}`)
      }
    }

    const removePlaceFromList = async (listPlaceId) => {
      try {
        const { error } = await supabase
          .from('list_places')
          .delete()
          .eq('id', listPlaceId)

        if (error) throw error

        // Remove from local state
        setListPlaces(prev => prev.filter(place => place.id !== listPlaceId))
        
      } catch (error) {
        console.error('Error removing place from list:', error)
        alert(`Failed to remove place: ${error.message}`)
      }
    }

    // Better search with scoring
    const searchAndSortPlaces = () => {
      // First filter out places already in list
      const availablePlaces = allSavedPlaces.filter(savedPlace => {
        const restaurant = savedPlace.restaurants
        if (!restaurant) return false
        
        const alreadyInList = listPlaces.some(listPlace => listPlace.restaurant_id === restaurant.id)
        return !alreadyInList
      })
      
      // If no search query, return all available places
      if (!searchQuery || !searchQuery.trim()) {
        return availablePlaces
      }
      
      const query = searchQuery.toLowerCase().trim()
      
      // Score each place based on match quality
      const scoredPlaces = availablePlaces.map(savedPlace => {
        const restaurant = savedPlace.restaurants
        const name = restaurant.name?.toLowerCase() || ''
        const address = restaurant.address?.toLowerCase() || ''
        const cuisine = restaurant.cuisine_type?.toLowerCase() || ''
        
        let score = 0
        
        // Exact name match (highest score)
        if (name === query) score += 100
        
        // Name starts with query
        else if (name.startsWith(query)) score += 50
        
        // Name contains query
        else if (name.includes(query)) score += 25
        
        // Address contains query
        if (address.includes(query)) score += 10
        
        // Cuisine contains query  
        if (cuisine.includes(query)) score += 5
        
        // Word-based matching for multi-word queries
        const searchWords = query.split(' ').filter(word => word.length > 1)
        if (searchWords.length > 1) {
          const allWordsInName = searchWords.every(word => name.includes(word))
          const allWordsInAddress = searchWords.every(word => address.includes(word))
          const allWordsInCuisine = searchWords.every(word => cuisine.includes(word))
          
          if (allWordsInName) score += 20
          else if (allWordsInAddress) score += 15
          else if (allWordsInCuisine) score += 10
        }
        
        return { ...savedPlace, searchScore: score }
      })
      
      // Filter out places with no matches and sort by score
      const matchedPlaces = scoredPlaces
        .filter(place => place.searchScore > 0)
        .sort((a, b) => b.searchScore - a.searchScore)
      
      console.log('Search results for "' + query + '":', 
        matchedPlaces.slice(0, 5).map(p => ({
          name: p.restaurants.name,
          score: p.searchScore
        }))
      )
      
      return matchedPlaces
    }
    
    const filteredSavedPlaces = searchAndSortPlaces()

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 5000,
        padding: '20px'
      }} onClick={onClose}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
        }} onClick={(e) => e.stopPropagation()}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: '700',
              color: '#1C1C1E'
            }}>Edit List</h3>
            <button 
              onClick={onClose}
              style={{
                background: '#F2F2F7',
                color: '#007AFF',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#1C1C1E',
                fontSize: '16px'
              }}>List Name *</label>
              <input
                type="text"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                placeholder="e.g., Date Night Spots, Weekend Brunch..."
                maxLength={100}
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #E5E5EA',
                  borderRadius: '12px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#1C1C1E',
                fontSize: '16px'
              }}>Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this list for?"
                rows={3}
                maxLength={300}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #E5E5EA',
                  borderRadius: '12px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  resize: 'vertical',
                  minHeight: '80px',
                  transition: 'border-color 0.2s'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '500'
              }}>
                <input
                  type="checkbox"
                  checked={isCollaborative}
                  onChange={(e) => setIsCollaborative(e.target.checked)}
                  style={{
                    marginRight: '12px',
                    transform: 'scale(1.2)'
                  }}
                />
                <span>👥 Make this a collaborative list</span>
              </label>
              <p style={{
                margin: '8px 0 0 0',
                fontSize: '14px',
                color: '#8E8E93',
                lineHeight: 1.4
              }}>
                {isCollaborative 
                  ? 'Friends can add places to this list' 
                  : 'Only you can add places to this list'
                }
              </p>
            </div>

            {/* Places Management Section */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <label style={{
                  fontWeight: '600',
                  color: '#1C1C1E',
                  fontSize: '16px'
                }}>Places in this list ({listPlaces.length})</label>
                <button
                  type="button"
                  onClick={() => setShowAddPlaces(!showAddPlaces)}
                  style={{
                    background: showAddPlaces ? '#F2F2F7' : '#007AFF',
                    color: showAddPlaces ? '#007AFF' : 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {showAddPlaces ? 'Done' : '+ Add Places'}
                </button>
              </div>

              {/* Add Places Interface */}
              {showAddPlaces && (
                <div style={{
                  border: '2px solid #007AFF',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '16px',
                  background: '#F8F9FF'
                }}>
                  <div style={{ marginBottom: '12px' }}>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search for 'Black Bear', 'Italian', etc..."
                      autoFocus
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #D1D1D6',
                        borderRadius: '6px',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#666', 
                    marginBottom: '12px'
                  }}>
                    {loadingPlaces ? 'Loading...' : 
                     `${filteredSavedPlaces.length} places ${searchQuery ? `matching "${searchQuery}"` : 'available'}`}
                  </div>

                  <div style={{ 
                    maxHeight: '200px', 
                    overflowY: 'auto',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    background: 'white'
                  }}>
                    {loadingPlaces ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                        <div>Loading your saved places...</div>
                      </div>
                    ) : filteredSavedPlaces.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                        <div style={{ fontSize: '16px', marginBottom: '4px' }}>
                          {allSavedPlaces.length === 0 ? 'No saved places' : 
                           searchQuery ? 'No matches found' : 'All places added!'}
                        </div>
                        <div style={{ fontSize: '12px' }}>
                          {allSavedPlaces.length === 0 ? 'Save some places first' : 
                           searchQuery ? `Try a different search` : 'All your saved places are in this list'}
                        </div>
                      </div>
                    ) : (
                      filteredSavedPlaces.map(savedPlace => {
                        const restaurant = savedPlace.restaurants
                        return (
                          <div
                            key={restaurant.id}
                            style={{
                              padding: '8px 12px',
                              borderBottom: '1px solid #eee',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <div style={{ flex: 1 }}>
                              <div style={{ 
                                fontWeight: '600', 
                                fontSize: '13px', 
                                color: '#333',
                                marginBottom: '2px'
                              }}>
                                {restaurant.name}
                                {savedPlace.searchScore && (
                                  <span style={{ fontSize: '10px', color: '#999', marginLeft: '6px' }}>
                                    ({savedPlace.searchScore})
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '11px', color: '#666' }}>
                                {restaurant.cuisine_type}{restaurant.address ? ` • ${restaurant.address}` : ''}
                              </div>
                            </div>
                            <button 
                              onClick={() => addPlaceToList(restaurant)}
                              style={{
                                background: '#007AFF',
                                color: 'white',
                                border: 'none',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                marginLeft: '6px'
                              }}
                            >
                              Add
                            </button>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Current Places in List */}
              <div style={{
                maxHeight: '200px',
                overflowY: 'auto',
                border: '1px solid #E5E5EA',
                borderRadius: '8px',
                background: 'white'
              }}>
                {listPlaces.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#8E8E93' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>🍽️</div>
                    <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>No places yet</div>
                    <div style={{ fontSize: '12px' }}>Add some places to get started!</div>
                  </div>
                ) : (
                  listPlaces.map(listPlace => {
                    const restaurant = listPlace.restaurants
                    return (
                      <div
                        key={listPlace.id}
                        style={{
                          padding: '12px',
                          borderBottom: '1px solid #F2F2F7',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '14px', color: '#1C1C1E' }}>
                            {restaurant.name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#8E8E93' }}>
                            {restaurant.cuisine_type} • {restaurant.address}
                          </div>
                        </div>
                        <button
                          onClick={() => removePlaceFromList(listPlace.id)}
                          style={{
                            background: '#FF3B30',
                            color: 'white',
                            border: 'none',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Form Actions */}
            <div style={{
              display: 'flex',
              gap: '12px',
              paddingTop: '20px',
              borderTop: '1px solid #E5E5EA'
            }}>
              <button 
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  background: '#FF3B30',
                  color: 'white',
                  border: 'none',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  opacity: deleting ? 0.5 : 1
                }}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
              <button 
                type="button"
                onClick={onClose}
                disabled={saving}
                style={{
                  flex: 1,
                  background: '#F2F2F7',
                  color: '#8E8E93',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.5 : 1
                }}
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={!listName.trim() || saving}
                style={{
                  flex: 1,
                  background: (!listName.trim() || saving) ? '#8E8E93' : '#007AFF',
                  color: 'white',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: (!listName.trim() || saving) ? 'not-allowed' : 'pointer'
                }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // Add Places Modal
  const AddPlacesModal = ({ onClose }) => {
    const [searchQuery, setSearchQuery] = useState('')
    const [allSavedPlaces, setAllSavedPlaces] = useState([])
    const [loadingPlaces, setLoadingPlaces] = useState(false)

    useEffect(() => {
      loadAllSavedPlaces()
    }, [])

    const loadAllSavedPlaces = async () => {
      setLoadingPlaces(true)
      try {
        const { data, error } = await supabase
          .from('saved_recs')
          .select(`
            id,
            restaurant_id,
            restaurants (
              id,
              name,
              address,
              cuisine_type,
              rating
            )
          `)
          .eq('user_id', session?.user?.id)
          .order('created_at', { ascending: false })

        if (error) throw error
        setAllSavedPlaces(data || [])
      } catch (error) {
        console.error('Error loading saved places:', error)
      } finally {
        setLoadingPlaces(false)
      }
    }

    // Better search with scoring
    const searchAndSortPlaces = () => {
      // If no search query, return all places
      if (!searchQuery || !searchQuery.trim()) {
        return allSavedPlaces
      }
      
      const query = searchQuery.toLowerCase().trim()
      
      // Score each place based on match quality
      const scoredPlaces = allSavedPlaces.map(savedPlace => {
        const restaurant = savedPlace.restaurants
        const name = restaurant.name?.toLowerCase() || ''
        const address = restaurant.address?.toLowerCase() || ''
        const cuisine = restaurant.cuisine_type?.toLowerCase() || ''
        
        let score = 0
        
        // Exact name match (highest score)
        if (name === query) score += 100
        
        // Name starts with query
        else if (name.startsWith(query)) score += 50
        
        // Name contains query
        else if (name.includes(query)) score += 25
        
        // Address contains query
        if (address.includes(query)) score += 10
        
        // Cuisine contains query  
        if (cuisine.includes(query)) score += 5
        
        // Word-based matching for multi-word queries
        const searchWords = query.split(' ').filter(word => word.length > 1)
        if (searchWords.length > 1) {
          const allWordsInName = searchWords.every(word => name.includes(word))
          const allWordsInAddress = searchWords.every(word => address.includes(word))
          const allWordsInCuisine = searchWords.every(word => cuisine.includes(word))
          
          if (allWordsInName) score += 20
          else if (allWordsInAddress) score += 15
          else if (allWordsInCuisine) score += 10
        }
        
        return { ...savedPlace, searchScore: score }
      })
      
      // Filter out places with no matches and sort by score
      const matchedPlaces = scoredPlaces
        .filter(place => place.searchScore > 0)
        .sort((a, b) => b.searchScore - a.searchScore)
      
      return matchedPlaces
    }
    
    const filteredSavedPlaces = searchAndSortPlaces()

    return (
      <div className="modal-overlay">
        <div className="modal" style={{ maxWidth: '500px', maxHeight: '600px' }}>
          <div className="modal-header">
            <h3>Add Places to List</h3>
            <button 
              className="close-button"
              onClick={onClose}
            >
              ×
            </button>
          </div>

          <div className="modal-content">
            {/* Search Bar */}
            <div className="form-field">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for 'Black Bear', 'Italian', etc..."
                autoFocus
              />
            </div>

            {/* Results Counter */}
            <div style={{ 
              fontSize: '14px', 
              color: '#666', 
              marginBottom: '16px',
              padding: '8px 0'
            }}>
              {loadingPlaces ? 'Loading...' : 
               `${filteredSavedPlaces.length} places ${searchQuery ? `matching "${searchQuery}"` : 'found'}`}
            </div>

            {/* Places List */}
            <div style={{ 
              maxHeight: '350px', 
              overflowY: 'auto',
              border: '1px solid #ddd',
              borderRadius: '8px'
            }}>
              {loadingPlaces ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                  <div style={{ fontSize: '24px', marginBottom: '12px' }}>🔄</div>
                  <div>Loading your saved places...</div>
                </div>
              ) : filteredSavedPlaces.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                  <div style={{ fontSize: '24px', marginBottom: '12px' }}>
                    {allSavedPlaces.length === 0 ? '🍽️' : searchQuery ? '🔍' : '✅'}
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
                    {allSavedPlaces.length === 0 ? 'No saved places' : 
                     searchQuery ? 'No matches found' : 'All places found!'}
                  </div>
                  <div style={{ fontSize: '14px' }}>
                    {allSavedPlaces.length === 0 ? 'Save some places first' : 
                     searchQuery ? `Try searching for something else` : 'Use search to find specific places'}
                  </div>
                </div>
              ) : (
                filteredSavedPlaces.map(savedPlace => {
                  const restaurant = savedPlace.restaurants
                  return (
                    <div
                      key={restaurant.id}
                      onClick={() => {
                        console.log('Clicked to add:', restaurant.name)
                        // This would need to be connected to the actual addPlaceToList function
                        alert(`Would add ${restaurant.name} to list`)
                        onClose()
                      }}
                      style={{
                        padding: '12px',
                        borderBottom: '1px solid #eee',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          fontWeight: '600', 
                          fontSize: '15px', 
                          color: '#333',
                          marginBottom: '4px'
                        }}>
                          {restaurant.name}
                          {savedPlace.searchScore && (
                            <span style={{ fontSize: '12px', color: '#999', marginLeft: '8px' }}>
                              (score: {savedPlace.searchScore})
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '13px', color: '#666' }}>
                          {restaurant.cuisine_type}{restaurant.address ? ` • ${restaurant.address}` : ''}
                        </div>
                        {restaurant.rating && (
                          <div style={{ fontSize: '12px', color: '#FF9500', marginTop: '2px' }}>
                            ⭐ {restaurant.rating}
                          </div>
                        )}
                      </div>
                      <button style={{
                        background: '#007AFF',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        marginLeft: '8px'
                      }}>
                        Add
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: '#666'
      }}>
        <div style={{ fontSize: '32px', marginBottom: '16px' }}>🔄</div>
        <div>Loading lists...</div>
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', background: '#F2F2F7', position: 'relative' }}>
      <style>{`
        .primary-button {
          background: #007AFF;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .primary-button:hover {
          background: #0056CC;
        }

        .lists-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .list-card {
          background: white;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          cursor: pointer;
          transition: all 0.2s;
        }

        .list-card:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          transform: translateY(-1px);
        }

        .list-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
        }

        .list-name {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #1C1C1E;
          flex: 1;
        }

        .list-type {
          font-size: 16px;
          margin-left: 12px;
        }

        .list-description {
          margin: 0 0 12px 0;
          color: #3C3C43;
          line-height: 1.5;
          font-size: 14px;
        }

        .list-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          color: #8E8E93;
        }

        .place-count {
          font-weight: 500;
        }

        .list-privacy {
          font-weight: 500;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: white;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          height: 100vh;
          height: 100dvh;
        }

        .modal {
          background: white;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #E5E5EA;
          flex-shrink: 0;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          color: #1C1C1E;
        }

        .close-button {
          background: #F2F2F7;
          border: none;
          font-size: 16px;
          color: #007AFF;
          cursor: pointer;
          padding: 8px 12px;
          border-radius: 8px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .close-button:hover {
          background: #E5E5EA;
        }

        .create-form {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        .form-content {
          padding: 20px;
          flex: 1;
          padding-bottom: 120px;
        }

        .form-field {
          margin-bottom: 20px;
        }

        .form-field label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #1C1C1E;
          font-size: 16px;
        }

        .form-field input, .form-field textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #D1D1D6;
          border-radius: 8px;
          font-size: 16px;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }

        .form-field input:focus, .form-field textarea:focus {
          outline: none;
          border-color: #007AFF;
        }

        .checkbox-label {
          display: flex !important;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          margin-bottom: 8px !important;
        }

        .checkbox-label input[type="checkbox"] {
          width: auto !important;
          margin: 0;
        }

        .checkbox-text {
          font-size: 16px;
          color: #1C1C1E;
        }

        .field-hint {
          margin: 0;
          font-size: 14px;
          color: #8E8E93;
          line-height: 1.4;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          padding: 20px;
          border-top: 1px solid #E5E5EA;
          background: white;
          position: fixed;
          bottom: 40px;
          left: 0;
          right: 0;
          z-index: 1001;
          flex-shrink: 0;
        }

        .cancel-button {
          flex: 1;
          background: #F2F2F7;
          color: #007AFF;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .cancel-button:hover {
          background: #E5E5EA;
        }

        .create-button {
          flex: 1;
          background: #007AFF;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .create-button:hover {
          background: #0056CC;
        }

        .create-button:disabled, .cancel-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>

      <div style={{
        position: 'sticky',
        top: 0,
        background: '#F2F2F7',
        zIndex: 100,
        borderBottom: '1px solid #E5E5EA'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          background: 'white'
        }}>
          <h1 style={{
            margin: 0,
            fontSize: '28px',
            fontWeight: '700',
            color: '#1C1C1E'
          }}>Lists</h1>
          <button 
            className="primary-button"
            onClick={() => setShowCreateModal(true)}
          >
            + Create List
          </button>
        </div>
      </div>

      <div style={{ padding: '20px', paddingBottom: '100px' }}>
        {lists.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#8E8E93'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
            <h2 style={{
              margin: '0 0 8px 0',
              fontSize: '24px',
              fontWeight: '600',
              color: '#1C1C1E'
            }}>Create Your First List</h2>
            <p style={{
              margin: '0 0 24px 0',
              fontSize: '16px',
              lineHeight: 1.5,
              maxWidth: '300px',
              marginLeft: 'auto',
              marginRight: 'auto'
            }}>
              Organize your saved places into custom lists for easy access
            </p>
            <button 
              className="primary-button"
              onClick={() => setShowCreateModal(true)}
            >
              Create Your First List
            </button>
          </div>
        ) : (
          <div className="lists-grid">
            {lists.map(list => (
              <div key={list.id} className="list-card">
                <div className="list-header">
                  <h3 className="list-name">{list.name}</h3>
                  <span className="list-type">
                    {list.is_public ? '👥' : '🔒'}
                  </span>
                </div>
                
                {list.description && (
                  <p className="list-description">{list.description}</p>
                )}
                
                <div className="list-footer">
                  <span className="place-count">
                    {/* Placeholder - would need to count places */}
                    0 places
                  </span>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <span className="list-privacy">
                      {list.is_public ? 'Collaborative' : 'Private'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditList(list)
                      }}
                      style={{
                        background: '#007AFF',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateListPage
          session={session}
          supabase={supabase}
          onClose={() => setShowCreateModal(false)}
          onListCreated={handleListCreated}
        />
      )}
      {editingList && (
        <EditListModal 
          list={editingList}
          onClose={() => setEditingList(null)}
          onSave={() => {
            fetchLists()
            setEditingList(null)
          }}
          onDelete={() => {
            fetchLists()
            setEditingList(null)
          }}
        />
      )}
    </div>
  )

  if (loading) {
    return (
      <div className="lists-view">
        {standalone ? (
          <div className="header">
            <div className="header-info">
              <h2>📝 Lists</h2>
              <p className="subtitle">Loading your lists...</p>
            </div>
          </div>
        ) : (
          <div className="header">
            <button className="back-button" onClick={onClose}>← Back</button>
            <h2>Loading...</h2>
          </div>
        )}
        <div className="loading-state">
          <div className="loading-spinner">🔄</div>
          <p>Loading your lists...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="lists-view">
      {standalone ? (
        <div className="header">
          <div className="header-info">
            <h2>📝 Lists</h2>
            <p className="subtitle">Collaborative collections of places</p>
          </div>
        </div>
      ) : (
        <div className="header">
          <button className="back-button" onClick={onClose}>← Back</button>
          <div className="header-info">
            <h2>My Lists</h2>
            <p className="subtitle">Organize your favorite places</p>
          </div>
        </div>
      )}

      {lists.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <h3>No lists yet</h3>
          <p>Create lists to organize your favorite places!</p>
          <button 
            className="primary-button" 
            onClick={() => setShowCreateModal(true)}
          >
            Create Your First List
          </button>
        </div>
      ) : (
        <div className="lists-grid">
          {lists.map(list => (
            <div key={list.id} className="list-card">
              <div className="list-header">
                <h3 className="list-name">{list.name}</h3>
                <div className="list-type">
                  {list.is_public ? '👥' : '🔒'}
                </div>
              </div>
              {list.description && (
                <p className="list-description">{list.description}</p>
              )}
              <div className="list-footer">
                <span className="place-count">{list.place_count || 0} places</span>
                <span className="list-privacy">
                  {list.is_public ? 'Collaborative' : 'Private'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateListPage
          session={session}
          supabase={supabase}
          onClose={() => setShowCreateModal(false)}
          onListCreated={handleListCreated}
        />
      )}

      <style>{`
        .lists-view {
          padding: 20px;
          max-width: 600px;
          margin: 0 auto;
          min-height: 100vh;
          padding-bottom: 100px;
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          gap: 16px;
        }

        .back-button {
          background: #F2F2F7;
          color: #007AFF;
          border: none;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .back-button:hover {
          background: #E5E5EA;
        }

        .header-info {
          flex: 1;
        }

        .header-info h2 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          color: #1C1C1E;
        }

        .subtitle {
          margin: 4px 0 0 0;
          color: #8E8E93;
          font-size: 14px;
        }

        .loading-state, .empty-state {
          text-align: center;
          padding: 60px 20px;
        }

        .loading-spinner, .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .empty-state h3 {
          margin: 0 0 8px 0;
          font-size: 20px;
          font-weight: 600;
          color: #1C1C1E;
        }

        .empty-state p {
          margin: 0 0 24px 0;
          color: #8E8E93;
          line-height: 1.5;
        }

        .primary-button {
          background: #007AFF;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .primary-button:hover {
          background: #0056CC;
        }

        .lists-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .list-card {
          background: white;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          cursor: pointer;
          transition: all 0.2s;
        }

        .list-card:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          transform: translateY(-1px);
        }

        .list-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
        }

        .list-name {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #1C1C1E;
          flex: 1;
        }

        .list-type {
          font-size: 16px;
          margin-left: 12px;
        }

        .list-description {
          margin: 0 0 12px 0;
          color: #3C3C43;
          line-height: 1.5;
          font-size: 14px;
        }

        .list-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          color: #8E8E93;
        }

        .place-count {
          font-weight: 500;
        }

        .list-privacy {
          font-weight: 500;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: white;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          height: 100vh;
          height: 100dvh; /* Use dynamic viewport height for mobile */
        }

        .modal {
          background: white;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #E5E5EA;
          flex-shrink: 0;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          color: #1C1C1E;
        }

        .close-button {
          background: #F2F2F7;
          border: none;
          font-size: 16px;
          color: #007AFF;
          cursor: pointer;
          padding: 8px 12px;
          border-radius: 8px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .close-button:hover {
          background: #E5E5EA;
        }

        .create-form {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        .form-content {
          padding: 20px;
          flex: 1;
          padding-bottom: 120px; /* Space for sticky buttons */
        }

        .form-field {
          margin-bottom: 20px;
        }

        .form-field label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #1C1C1E;
          font-size: 16px;
        }

        .form-field input, .form-field textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #D1D1D6;
          border-radius: 8px;
          font-size: 16px;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }

        .form-field input:focus, .form-field textarea:focus {
          outline: none;
          border-color: #007AFF;
        }

        .checkbox-label {
          display: flex !important;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          margin-bottom: 8px !important;
        }

        .checkbox-label input[type="checkbox"] {
          width: auto !important;
          margin: 0;
        }

        .checkbox-text {
          font-size: 16px;
          color: #1C1C1E;
        }

        .field-hint {
          margin: 0;
          font-size: 14px;
          color: #8E8E93;
          line-height: 1.4;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          padding: 20px;
          border-top: 1px solid #E5E5EA;
          background: white;
          position: fixed;
          bottom: 40px;
          left: 0;
          right: 0;
          z-index: 1001;
          flex-shrink: 0;
        }

        .cancel-button {
          flex: 1;
          background: #F2F2F7;
          color: #007AFF;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .cancel-button:hover {
          background: #E5E5EA;
        }

        .create-button {
          flex: 1;
          background: #007AFF;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .create-button:hover {
          background: #0056CC;
        }

        .create-button:disabled, .cancel-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  )
} 