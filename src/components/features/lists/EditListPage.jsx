import React, { useState, useEffect } from 'react'
import Button from '../../ui/Button'
import Container from '../../ui/Layout/Container'
import LoadingSpinner from '../../ui/LoadingSpinner'
import EmptyState from '../../ui/EmptyState'
import { colors, spacing, typography, borderRadius } from '../../../styles/tokens'

// Custom Alert Modal Component
const AlertModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "OK", cancelText = "Cancel", type = "info" }) => {
  if (!isOpen) return null

  const getIcon = () => {
    switch (type) {
      case 'error': return '❌'
      case 'success': return '✅'
      case 'warning': return '⚠️'
      default: return 'ℹ️'
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: spacing.lg
    }}>
      <div style={{
        backgroundColor: colors.background.primary,
        borderRadius: borderRadius.lg,
        padding: spacing.xl,
        maxWidth: '400px',
        width: '100%',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
      }}>
        <div style={{
          textAlign: 'center',
          marginBottom: spacing.lg
        }}>
          <div style={{ fontSize: '32px', marginBottom: spacing.md }}>
            {getIcon()}
          </div>
          <h3 style={{
            margin: `0 0 ${spacing.sm} 0`,
            fontSize: typography.size.lg,
            fontWeight: typography.weight.semibold,
            color: colors.text.primary
          }}>
            {title}
          </h3>
          <p style={{
            margin: 0,
            fontSize: typography.size.base,
            color: colors.text.secondary,
            lineHeight: 1.4
          }}>
            {message}
          </p>
        </div>
        
        <div style={{
          display: 'flex',
          gap: spacing.md,
          justifyContent: 'center'
        }}>
          {onCancel && (
            <Button
              variant="secondary"
              onClick={onCancel}
            >
              {cancelText}
            </Button>
          )}
          <Button
            variant="primary"
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function EditListPage({ list, session, supabase, onClose, onSave, onDelete }) {
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

  // Alert modal state
  const [alert, setAlert] = useState({ isOpen: false, title: '', message: '', type: 'info', onConfirm: null, onCancel: null })

  const showAlert = (title, message, type = 'info', onConfirm = null, onCancel = null) => {
    setAlert({
      isOpen: true,
      title,
      message,
      type,
      onConfirm: onConfirm || (() => setAlert(prev => ({ ...prev, isOpen: false }))),
      onCancel
    })
  }

  const showConfirm = (title, message, onConfirm, onCancel = null) => {
    setAlert({
      isOpen: true,
      title,
      message,
      type: 'warning',
      onConfirm,
      onCancel: onCancel || (() => setAlert(prev => ({ ...prev, isOpen: false }))),
      confirmText: 'Delete',
      cancelText: 'Cancel'
    })
  }

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
      showAlert('Success!', 'Your list has been updated successfully.', 'success', () => {
        setAlert(prev => ({ ...prev, isOpen: false }))
        onSave()
        onClose()
      })
    } catch (error) {
      console.error('Error updating list:', error)
      showAlert('Error', `Failed to update list: ${error.message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    showConfirm(
      'Delete List',
      'Are you sure you want to delete this list? This action cannot be undone.',
      async () => {
        setAlert(prev => ({ ...prev, isOpen: false }))
        setDeleting(true)
        try {
          const { error } = await supabase
            .from('lists')
            .delete()
            .eq('id', list.id)

          if (error) throw error

          console.log('List deleted successfully')
          showAlert('Deleted!', 'Your list has been deleted successfully.', 'success', () => {
            setAlert(prev => ({ ...prev, isOpen: false }))
            onDelete()
            onClose()
          })
        } catch (error) {
          console.error('Error deleting list:', error)
          showAlert('Error', `Failed to delete list: ${error.message}`, 'error')
        } finally {
          setDeleting(false)
        }
      }
    )
  }

  const addPlaceToList = async (restaurant) => {
    try {
      // Check if already in list
      const existingPlace = listPlaces.find(place => place.restaurant_id === restaurant.id)
      if (existingPlace) {
        showAlert('Already Added', 'This place is already in your list!', 'info')
        return
      }

      const { data, error } = await supabase
        .from('list_places')
        .insert([
          {
            list_id: list.id,
            restaurant_id: restaurant.id
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
      showAlert('Added!', `${restaurant.name} has been added to your list.`, 'success')
      
    } catch (error) {
      console.error('Error adding place to list:', error)
      showAlert('Error', `Failed to add place: ${error.message}`, 'error')
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
      showAlert('Error', `Failed to remove place: ${error.message}`, 'error')
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
      
      return { ...savedPlace, searchScore: score }
    })
    
    // Filter out places with no matches and sort by score
    return scoredPlaces
      .filter(place => place.searchScore > 0)
      .sort((a, b) => b.searchScore - a.searchScore)
  }
  
  const filteredSavedPlaces = searchAndSortPlaces()

  return (
    <>
      <AlertModal {...alert} />
      
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: colors.background.primary,
        zIndex: 5000,
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `${spacing.lg} ${spacing.lg}`,
          borderBottom: `1px solid ${colors.border.light}`,
          backgroundColor: colors.background.primary,
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}>
          <Button 
            variant="secondary" 
            size="small"
            onClick={onClose}
            disabled={saving || deleting}
          >
            Cancel
          </Button>
          
          <h1 style={{
            margin: 0,
            fontSize: typography.size.lg,
            fontWeight: typography.weight.semibold,
            color: colors.text.primary,
            textAlign: 'center'
          }}>
            Edit List
          </h1>
          
          <Button 
            variant="primary" 
            size="small"
            onClick={handleSubmit}
            disabled={saving || deleting || !listName.trim()}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          paddingBottom: spacing.xl
        }}>
          <Container>
            <form onSubmit={handleSubmit} style={{ paddingTop: spacing.xl }}>
              {/* List Details Section */}
              <div style={{ marginBottom: spacing.xxl }}>
                <h2 style={{
                  margin: `0 0 ${spacing.lg} 0`,
                  fontSize: typography.size.lg,
                  fontWeight: typography.weight.semibold,
                  color: colors.text.primary
                }}>List Details</h2>

                <div style={{ marginBottom: spacing.xl }}>
                  <label style={{
                    display: 'block',
                    marginBottom: spacing.sm,
                    fontSize: typography.size.base,
                    fontWeight: typography.weight.semibold,
                    color: colors.text.primary
                  }}>List Name</label>
                  <input
                    type="text"
                    value={listName}
                    onChange={(e) => setListName(e.target.value)}
                    placeholder="e.g., Date Night Spots, Weekend Brunch..."
                    maxLength={100}
                    required
                    style={{
                      width: '100%',
                      padding: spacing.lg,
                      border: `2px solid ${colors.border.default}`,
                      borderRadius: borderRadius.md,
                      fontSize: typography.size.lg,
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box',
                      backgroundColor: colors.background.primary
                    }}
                    onFocus={(e) => e.target.style.borderColor = colors.primary}
                    onBlur={(e) => e.target.style.borderColor = colors.border.default}
                  />
                </div>

                <div style={{ marginBottom: spacing.xl }}>
                  <label style={{
                    display: 'block',
                    marginBottom: spacing.sm,
                    fontSize: typography.size.base,
                    fontWeight: typography.weight.semibold,
                    color: colors.text.primary
                  }}>Description (optional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What's this list for?"
                    rows={3}
                    maxLength={300}
                    style={{
                      width: '100%',
                      padding: spacing.lg,
                      border: `2px solid ${colors.border.default}`,
                      borderRadius: borderRadius.md,
                      fontSize: typography.size.base,
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      backgroundColor: colors.background.primary,
                      minHeight: '100px'
                    }}
                    onFocus={(e) => e.target.style.borderColor = colors.primary}
                    onBlur={(e) => e.target.style.borderColor = colors.border.default}
                  />
                </div>

                <div style={{ 
                  marginBottom: spacing.xl,
                  padding: spacing.lg,
                  backgroundColor: colors.background.secondary,
                  borderRadius: borderRadius.md,
                  border: `1px solid ${colors.border.light}`
                }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: spacing.md,
                    cursor: 'pointer'
                  }}>
                    <input
                      type="checkbox"
                      checked={isCollaborative}
                      onChange={(e) => setIsCollaborative(e.target.checked)}
                      style={{
                        width: '20px',
                        height: '20px',
                        cursor: 'pointer',
                        marginTop: '2px',
                        flexShrink: 0
                      }}
                    />
                    <div>
                      <span style={{
                        fontSize: typography.size.base,
                        fontWeight: typography.weight.semibold,
                        color: colors.text.primary,
                        display: 'block',
                        marginBottom: spacing.xs
                      }}>
                        Make this a collaborative list
                      </span>
                      <span style={{
                        fontSize: typography.size.sm,
                        color: colors.text.secondary,
                        lineHeight: 1.4
                      }}>
                        {isCollaborative 
                          ? 'Friends can add places to this list' 
                          : 'Only you can add places to this list'
                        }
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Places Section */}
              <div style={{ marginBottom: spacing.xxl }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: spacing.lg
                }}>
                  <h2 style={{
                    margin: 0,
                    fontSize: typography.size.lg,
                    fontWeight: typography.weight.semibold,
                    color: colors.text.primary
                  }}>Places ({listPlaces.length})</h2>
                  
                  <Button 
                    variant="secondary" 
                    size="small"
                    type="button"
                    onClick={() => setShowAddPlaces(!showAddPlaces)}
                  >
                    {showAddPlaces ? 'Done Adding' : 'Add Places'}
                  </Button>
                </div>

                {/* Add Places Section */}
                {showAddPlaces && (
                  <div style={{
                    marginBottom: spacing.xl,
                    padding: spacing.lg,
                    backgroundColor: colors.background.secondary,
                    borderRadius: borderRadius.md,
                    border: `1px solid ${colors.border.light}`
                  }}>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search your saved places..."
                      style={{
                        width: '100%',
                        padding: spacing.lg,
                        border: `1px solid ${colors.border.default}`,
                        borderRadius: borderRadius.md,
                        fontSize: typography.size.base,
                        outline: 'none',
                        marginBottom: spacing.lg,
                        boxSizing: 'border-box',
                        backgroundColor: colors.background.primary
                      }}
                    />

                    {loadingPlaces ? (
                      <div style={{ textAlign: 'center', padding: spacing.xl }}>
                        <LoadingSpinner />
                      </div>
                    ) : filteredSavedPlaces.length === 0 ? (
                      <EmptyState
                        icon="🔍"
                        title={searchQuery ? "No places found" : "No places to add"}
                        description={searchQuery ? "Try a different search term" : "All your saved places are already in this list"}
                      />
                    ) : (
                      <div style={{
                        maxHeight: '300px',
                        overflowY: 'auto',
                        gap: spacing.sm,
                        display: 'flex',
                        flexDirection: 'column'
                      }}>
                        {filteredSavedPlaces.slice(0, 20).map(savedPlace => {
                          const restaurant = savedPlace.restaurants
                          if (!restaurant) return null
                          
                          return (
                            <div
                              key={savedPlace.id}
                              onClick={() => addPlaceToList(restaurant)}
                              style={{
                                padding: spacing.lg,
                                backgroundColor: colors.background.primary,
                                borderRadius: borderRadius.md,
                                border: `1px solid ${colors.border.light}`,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.backgroundColor = colors.background.secondary
                                e.target.style.borderColor = colors.primary
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.backgroundColor = colors.background.primary
                                e.target.style.borderColor = colors.border.light
                              }}
                            >
                              <div style={{
                                fontSize: typography.size.base,
                                fontWeight: typography.weight.semibold,
                                color: colors.text.primary,
                                marginBottom: spacing.xs
                              }}>
                                {restaurant.name}
                              </div>
                              {restaurant.address && (
                                <div style={{
                                  fontSize: typography.size.sm,
                                  color: colors.text.secondary
                                }}>
                                  {restaurant.address}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Current Places */}
                {listPlaces.length === 0 ? (
                  <EmptyState
                    icon="📝"
                    title="No places in this list yet"
                    description="Add places from your saved collection"
                  />
                ) : (
                  <div style={{
                    gap: spacing.sm,
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    {listPlaces.map(listPlace => {
                      const restaurant = listPlace.restaurants
                      if (!restaurant) return null
                      
                      return (
                        <div
                          key={listPlace.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: spacing.lg,
                            backgroundColor: colors.background.primary,
                            borderRadius: borderRadius.md,
                            border: `1px solid ${colors.border.light}`
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{
                              fontSize: typography.size.base,
                              fontWeight: typography.weight.semibold,
                              color: colors.text.primary,
                              marginBottom: spacing.xs
                            }}>
                              {restaurant.name}
                            </div>
                            {restaurant.address && (
                              <div style={{
                                fontSize: typography.size.sm,
                                color: colors.text.secondary
                              }}>
                                {restaurant.address}
                              </div>
                            )}
                          </div>
                          
                          <Button
                            variant="danger"
                            size="small"
                            type="button"
                            onClick={() => removePlaceFromList(listPlace.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Delete Section */}
              <div style={{
                padding: spacing.lg,
                backgroundColor: '#FEF2F2',
                borderRadius: borderRadius.md,
                border: `1px solid #FECACA`
              }}>
                <h3 style={{
                  margin: `0 0 ${spacing.sm} 0`,
                  fontSize: typography.size.base,
                  fontWeight: typography.weight.semibold,
                  color: colors.error
                }}>Danger Zone</h3>
                <p style={{
                  margin: `0 0 ${spacing.lg} 0`,
                  fontSize: typography.size.sm,
                  color: colors.text.secondary,
                  lineHeight: 1.4
                }}>
                  Once you delete a list, there is no going back. Please be certain.
                </p>
                <Button
                  variant="danger"
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting || saving}
                >
                  {deleting ? 'Deleting...' : 'Delete List'}
                </Button>
              </div>
            </form>
          </Container>
        </div>
      </div>
    </>
  )
} 