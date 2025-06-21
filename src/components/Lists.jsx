import React, { useState, useEffect } from 'react'
import { useLists } from '../hooks/useLists'
import CreateListPage from './features/lists/CreateListPage'
import EditListPage from './features/lists/EditListPage'

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
                        {restaurant.address && (
                          <div style={{ fontSize: '13px', color: '#666' }}>
                            {restaurant.address}
                          </div>
                        )}
                        {restaurant.cuisine_type && (
                          <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>
                            {restaurant.cuisine_type}
                          </div>
                        )}
                      </div>
                      <div style={{ 
                        fontSize: '18px', 
                        color: '#007AFF',
                        marginLeft: '12px',
                        flexShrink: 0
                      }}>
                        +
                      </div>
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

  // Handle clicks on list items
  const handleListClick = (list) => {
    console.log('List clicked:', list.name)
    // For now, just open edit modal
    handleEditList(list)
  }

  // Show create modal when needed
  if (showCreateModal) {
    return (
      <div>
        <CreateListPage
          session={session}
          supabase={supabase}
          onClose={() => setShowCreateModal(false)}
          onListCreated={handleListCreated}
        />
      </div>
    )
  }

  // Show edit modal when needed
  if (editingList) {
    return (
      <div>
        {editingList && (
          <EditListPage 
            list={editingList}
            session={session}
            supabase={supabase}
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
                    {(() => {
                      const count = list.list_places?.length || 0
                      return `${count} ${count === 1 ? 'place' : 'places'}`
                    })()}
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
    </div>
  )
} 