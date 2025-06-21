import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

// ShareModal component - defined before main component to avoid hoisting issues
const ShareModal = ({ restaurant, friends, loading, onShare, onClose, sharing }) => {
  const [selectedFriends, setSelectedFriends] = useState([])
  const [message, setMessage] = useState('')

  const toggleFriend = (friendId) => {
    setSelectedFriends(prev => 
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    )
  }

  const handleSubmit = () => {
    if (selectedFriends.length > 0) {
      onShare(selectedFriends, message)
    }
  }

  return createPortal(
    <div className="share-modal-fullscreen" onClick={(e) => e.stopPropagation()}>
      <div className="share-header">
        <button className="back-button" onClick={onClose}>← Back</button>
        <h3>Share "{restaurant.name}"</h3>
        <div></div>
      </div>

        {loading ? (
          <div className="loading-friends">
            <div>Loading friends...</div>
          </div>
        ) : friends.length === 0 ? (
          <div className="no-friends">
            <p>You don't have any friends yet.</p>
            <p>Add friends to start sharing your favorite places!</p>
          </div>
        ) : (
          <>
            <div className="friends-list">
              <p className="friends-header">Select friends to share with:</p>
              {friends.map(friend => (
                <div 
                  key={friend.friend_id}
                  className={`friend-item ${selectedFriends.includes(friend.friend_id) ? 'selected' : ''}`}
                  onClick={() => toggleFriend(friend.friend_id)}
                >
                  <div className="friend-info">
                    <div className="friend-name">{friend.profiles.display_name}</div>
                  </div>
                  <div className="friend-checkbox">
                    {selectedFriends.includes(friend.friend_id) ? '✓' : '○'}
                  </div>
                </div>
              ))}
            </div>

            <div className="message-section">
              <label>Optional message:</label>
              <div className="textarea-container">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Add a note about this place..."
                  rows={3}
                  maxLength={200}
                />
                <div className="char-count">{message.length}/200</div>
              </div>
            </div>

            <div className="share-actions">
              <button 
                className="action-button secondary" 
                onClick={onClose}
                disabled={sharing}
              >
                Cancel
              </button>
              <button 
                className="action-button primary" 
                onClick={handleSubmit}
                disabled={selectedFriends.length === 0 || sharing}
              >
                {sharing ? 'Sharing...' : `Share with ${selectedFriends.length} friend${selectedFriends.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </>
        )}
    </div>,
    document.body
  )
}

// Mode configuration - defines what features are available in each mode
const MODE_CONFIG = {
  full: {
    showHours: true,
    showPhone: true,
    showNotes: true,
    showTags: true,
    showShare: true,
    showEdit: true,
    showDelete: true,
    showAddButton: false,
    isModal: false,
    reducePadding: false
  },
  modal: {
    showHours: true,
    showPhone: true,
    showNotes: true,
    showTags: true,
    showShare: true,
    showEdit: true,
    showDelete: true,
    showAddButton: false,
    isModal: true,
    reducePadding: false
  },
  preview: {
    showHours: false,
    showPhone: false,
    showNotes: false,
    showTags: false,
    showShare: false,
    showEdit: false,
    showDelete: false,
    showAddButton: true,
    isModal: false,
    reducePadding: true
  },
  discover: {
    showHours: false,
    showPhone: false,
    showNotes: false,
    showTags: false,
    showShare: false,
    showEdit: false,
    showDelete: false,
    showAddButton: true,
    isModal: true,
    reducePadding: true
  },
  readonly: {
    showHours: true,
    showPhone: true,
    showNotes: false,
    showTags: false,
    showShare: false,
    showEdit: false,
    showDelete: false,
    showAddButton: false,
    isModal: true,
    reducePadding: false
  }
}

export default function RestaurantDetail({ 
  restaurant, 
  savedRec, 
  onClose, 
  onEdit, 
  onDelete, 
  supabase, 
  session, 
  mode = 'full',
  onAddToList = null,
  showAddButton = null // Override for showAddButton
}) {
  // Get configuration for the current mode
  const config = {
    ...MODE_CONFIG[mode],
    // Override showAddButton if explicitly provided
    ...(showAddButton !== null && { showAddButton })
  }
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [showShareSuccessModal, setShowShareSuccessModal] = useState(false)
  const [shareSuccessMessage, setShareSuccessMessage] = useState('')
  const [editNotes, setEditNotes] = useState(savedRec.user_notes || '')
  const [editTags, setEditTags] = useState(savedRec.tags || [])
  const notesTextareaRef = useRef(null)
  const tagInputRef = useRef(null)
  const [saving, setSaving] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [friends, setFriends] = useState([])
  const [loadingFriends, setLoadingFriends] = useState(false)
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    setEditNotes(savedRec.user_notes || '')
    setEditTags(savedRec.tags || [])
  }, [savedRec])

  useEffect(() => {
    if (editMode && notesTextareaRef.current) {
      notesTextareaRef.current.scrollTop = 0;
    }
  }, [editMode]);

  // Tag input handlers
  const handleTagInputKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const value = e.target.value.trim()
      if (value && !editTags.includes(value)) {
        setEditTags([...editTags, value])
        e.target.value = ''
      }
    } else if (e.key === 'Backspace' && !e.target.value) {
      setEditTags(editTags.slice(0, -1))
    }
  }
  const handleRemoveTag = (tag) => {
    setEditTags(editTags.filter(t => t !== tag))
  }

  // Save handler
  const handleSave = async () => {
    setSaving(true)
    try {
      // Add any pending tag in the input
      const pendingTag = tagInputRef.current && tagInputRef.current.value.trim()
      let tagsToSave = editTags
      if (pendingTag && !editTags.includes(pendingTag)) {
        tagsToSave = [...editTags, pendingTag]
        setEditTags(tagsToSave)
        tagInputRef.current.value = ''
      }
      // Update saved_recs in Supabase
      const { error } = await supabase
        .from('saved_recs')
        .update({
          user_notes: editNotes,
          tags: tagsToSave
        })
        .eq('id', savedRec.id)
      if (error) throw error
      setEditMode(false)
      // Fetch the updated row with joined restaurant
      const { data: updatedRows, error: fetchError } = await supabase
        .from('saved_recs')
        .select('*, restaurants(*)')
        .eq('id', savedRec.id)
        .single()
      if (fetchError) throw fetchError
      if (onEdit) onEdit(updatedRows)
    } catch (err) {
      alert('Failed to save changes: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (config.isModal) {
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
      
      return () => {
        document.body.style.overflow = ''
        document.body.style.position = ''
        document.body.style.width = ''
      }
    }
  }, [config.isModal])

  if (!restaurant || !savedRec) return null

  // Parse source data for enhanced info
  const sourceData = savedRec.source_data || {}
  const photos = sourceData.photos || []
  const reviews = sourceData.reviews || []
  const hours = restaurant.hours || sourceData.hours

  const handleDelete = async () => {
    try {
      await onDelete(savedRec.id)
      // Close the delete confirmation modal
      setShowDeleteConfirm(false)
      // Always close the restaurant detail (whether modal or bottom sheet)
      onClose()
    } catch (error) {
      console.error('Delete failed:', error)
      alert('Failed to delete restaurant. Please try again.')
    }
  }

  const handleGetDirections = () => {
    // Search for the restaurant by name and address in Google Maps
    // This opens the actual business listing instead of just coordinates
    let searchQuery = restaurant.name
    
    if (restaurant.address) {
      searchQuery += ` ${restaurant.address}`
    }
    
    if (searchQuery) {
      const url = `https://maps.google.com/maps?q=${encodeURIComponent(searchQuery)}`
      window.open(url, '_blank')
    }
  }

  const formatPhoneNumber = (phone) => {
    if (!phone) return null
    // Simple formatting for display
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')
  }

  // Load friends when share modal opens
  const fetchFriends = async () => {
    if (!session?.user) return
    
    setLoadingFriends(true)
    try {
      const user = session.user

      // Get accepted friendships where user is either requester or addressee
      const { data: acceptedFriendships, error } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id, created_at')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)

      if (error) throw error

      if (!acceptedFriendships?.length) {
        setFriends([])
        return
      }

      // Extract friend IDs (the other person in each friendship)
      const friendIds = acceptedFriendships.map(friendship => 
        friendship.requester_id === user.id 
          ? friendship.addressee_id 
          : friendship.requester_id
      )

      // Get friend profiles
      const { data: friendProfiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, display_name, bio, avatar_url')
        .in('id', friendIds)

      if (profileError) throw profileError

      // Combine friendship data with profiles
      const friendsWithProfiles = acceptedFriendships.map(friendship => ({
        friend_id: friendship.requester_id === user.id 
          ? friendship.addressee_id 
          : friendship.requester_id,
        profiles: friendProfiles.find(p => p.id === (
          friendship.requester_id === user.id 
            ? friendship.addressee_id 
            : friendship.requester_id
        ))
      }))

      setFriends(friendsWithProfiles || [])
    } catch (error) {
      console.error('Error fetching friends:', error)
      alert('Failed to load friends: ' + error.message)
    } finally {
      setLoadingFriends(false)
    }
  }

  // Handle sharing place with selected friends
  const handleSharePlace = async (selectedFriends, message = '') => {
    if (!selectedFriends.length) return

    setSharing(true)
    try {
      const user = session.user
      if (!user) throw new Error('Not authenticated')

      // Create share records for each selected friend
      const sharePromises = selectedFriends.map(friendId => 
        supabase
          .from('place_shares')
          .insert({
            saved_rec_id: savedRec.id,
            shared_by: user.id,
            shared_with: friendId,
            message: message || null
          })
      )

      const results = await Promise.all(sharePromises)
      
      // Check for errors
      const errors = results.filter(r => r.error)
      if (errors.length > 0) {
        throw new Error(`Failed to share with ${errors.length} friends`)
      }

      setShareSuccessMessage(`Successfully shared "${restaurant.name}" with ${selectedFriends.length} friend${selectedFriends.length > 1 ? 's' : ''}!`)
      setShowShareModal(false)
      setShowShareSuccessModal(true)

    } catch (error) {
      console.error('Error sharing place:', error)
      setShareSuccessMessage('Failed to share place: ' + error.message)
      setShowShareModal(false)
      setShowShareSuccessModal(true)
    } finally {
      setSharing(false)
    }
  }

  // Open share modal and load friends
  const handleOpenShare = () => {
    setShowShareModal(true)
    fetchFriends()
  }

  const DetailContent = (
    <div className="restaurant-detail-content">
      {/* Header */}
      <div className="detail-header">
        <div>
          <h1 className="detail-title">{restaurant.name}</h1>
          {restaurant.rating && (
            <div className="detail-rating">
              ⭐ {restaurant.rating}
              {restaurant.price_level && (
                <span className="price-level">
                  {' • ' + '$'.repeat(restaurant.price_level)}
                </span>
              )}
            </div>
          )}
        </div>
        <button className="close-button" onClick={onClose}>❌</button>
      </div>

      {/* Photos */}
      {photos.length > 0 && (
        <div className="detail-photos">
          <div className="photos-grid">
            {photos.slice(0, 3).map((photo, index) => (
              <img 
                key={index}
                src={photo.url} 
                alt={`${restaurant.name} photo ${index + 1}`}
                className="restaurant-photo"
              />
            ))}
          </div>
        </div>
      )}

      {/* Address & Contact */}
      <div className="detail-section address-contact-section">
        {restaurant.address && (
          <div className="detail-item">
            <div className="item-label">📍 Address</div>
            <div className="item-value">{restaurant.address}</div>
          </div>
        )}

        {config.showPhone && restaurant.phone && (
          <div className="detail-item">
            <div className="item-label">📞 Phone</div>
            <div className="item-value">
              <a href={`tel:${restaurant.phone}`} className="contact-link">
                {formatPhoneNumber(restaurant.phone)}
              </a>
            </div>
          </div>
        )}

        {restaurant.website && (
          <div className="detail-item">
            <div className="item-label">🌐 Website</div>
            <div className="item-value">
              <a 
                href={restaurant.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="contact-link"
              >
                Visit Website →
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Hours */}
      {config.showHours && hours && hours.weekdayText && (
        <div className="detail-section">
          <div className="section-title">🕐 Hours</div>
          <div className="hours-list">
            {hours.weekdayText.map((dayHours, index) => (
              <div key={index} className="hours-item">
                {dayHours}
              </div>
            ))}
          </div>
          {hours.openNow !== undefined && (
            <div className={`open-status ${hours.openNow ? 'open' : 'closed'}`}>
              {hours.openNow ? '🟢 Open Now' : '🔴 Closed'}
            </div>
          )}
        </div>
      )}

      {/* Personal Notes */}
      {config.showNotes && (
        <div className="detail-section">
          <div className="section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>📝 Personal Notes</span>
            {!editMode && config.showEdit && (
              <button onClick={() => {
                setEditMode(true)
                setTimeout(() => {
                  if (notesTextareaRef.current) notesTextareaRef.current.focus()
                }, 0)
              }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1em', color: '#3b82f6', marginLeft: 8 }} title="Edit notes">✏️</button>
            )}
          </div>
          {editMode ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <textarea
                ref={notesTextareaRef}
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  resize: 'vertical',
                  marginBottom: '12px',
                  minHeight: '100px',
                  overflowY: 'auto'
                }}
                placeholder="Add your personal notes..."
                autoFocus
                onFocus={() => {
                  if (notesTextareaRef.current) {
                    const modal = notesTextareaRef.current.closest('.modal');
                    if (modal) {
                      modal.scrollTop = notesTextareaRef.current.offsetTop - 20; // 20px padding
                    }
                  }
                }}
              />
              <button onClick={handleSave} disabled={saving} style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, padding: '8px 12px', fontWeight: 600, cursor: 'pointer', fontSize: '1em' }} title="Save notes">💾</button>
            </div>
          ) : (
            savedRec.user_notes ? (
              <div className="personal-notes">{savedRec.user_notes}</div>
            ) : (
              <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>No notes yet.</div>
            )
          )}
        </div>
      )}

      {/* Tags */}
      {config.showTags && (
        <div className="detail-section">
          <div className="section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>🏷️ Tags</span>
            {!editMode && config.showEdit && (
              <button onClick={() => {
                setEditMode(true)
                setTimeout(() => {
                  if (tagInputRef.current) tagInputRef.current.focus()
                }, 0)
              }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1em', color: '#3b82f6', marginLeft: 8 }} title="Edit tags">✏️</button>
            )}
          </div>
          {editMode ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px', marginBottom: '12px', alignItems: 'center' }}>
              {editTags.map((tag, idx) => (
                <span key={tag} style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '8px', fontSize: '0.9em', display: 'flex', alignItems: 'center' }}>
                  {tag}
                  <button onClick={() => handleRemoveTag(tag)} style={{ marginLeft: 4, background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '1em' }} title="Remove tag">×</button>
                </span>
              ))}
              <input
                ref={tagInputRef}
                type="text"
                onKeyDown={handleTagInputKeyDown}
                placeholder="Add tag"
                style={{
                  border: 'none',
                  outline: 'none',
                  fontSize: '0.95em',
                  minWidth: 60,
                  maxWidth: 90,
                  background: '#3b82f6',
                  color: 'white',
                  borderRadius: '8px',
                  padding: '4px 12px',
                  marginLeft: '4px',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  '::placeholder': { color: 'white', opacity: 1 },
                }}
              />
              <button onClick={handleSave} disabled={saving} style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, padding: '8px 12px', fontWeight: 600, cursor: 'pointer', fontSize: '1em' }} title="Save tags">💾</button>
            </div>
          ) : (
            savedRec.tags && savedRec.tags.length > 0 ? (
              <div className="restaurant-tags">
                {savedRec.tags.map((tag, index) => (
                  <span key={index} className="tag">
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>No tags yet.</div>
            )
          )}
        </div>
      )}

      {/* Reviews */}
      {reviews.length > 0 && (
        <div className="detail-section">
          <div className="section-title">💬 Recent Reviews</div>
          <div className="reviews-list">
            {reviews.slice(0, 2).map((review, index) => {
              // Clean author name - remove rating numbers that got concatenated
              let cleanAuthor = 'Anonymous'
              if (review.author) {
                // Remove any leading numbers (1-5 star ratings) followed by optional spaces
                // This catches patterns like "5Amy Hall", "3Gregory Espina", "1Brian", etc.
                cleanAuthor = review.author.replace(/^[12345]\s*/, '').trim()
                
                // If that didn't work, try removing any leading digits
                if (cleanAuthor === review.author) {
                  cleanAuthor = review.author.replace(/^\d+\s*/, '').trim()
                }
                
                // Final fallback - remove everything before first letter
                if (!cleanAuthor || /^\d/.test(cleanAuthor)) {
                  const match = review.author.match(/[a-zA-Z].*/)
                  cleanAuthor = match ? match[0].trim() : 'Anonymous'
                }
                
                if (!cleanAuthor) cleanAuthor = 'Anonymous'
              }
              
              // Limit review text to 150 characters with ellipsis
              const truncatedText = review.text && review.text.length > 150 
                ? review.text.substring(0, 150) + '...' 
                : review.text

              return (
                <div key={index} className="review-item">
                  <div className="review-header">
                    <span className="review-rating">⭐ {review.rating}</span>
                    <span className="review-author">{cleanAuthor}</span>
                  </div>
                  <div className="review-text">{truncatedText}</div>
                  <div className="review-time">{review.time}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="detail-actions">
        {config.showAddButton ? (
          <button 
            className="action-button add-button" 
            onClick={() => onAddToList && onAddToList(restaurant)}
          >
            ➕ Add to My Places
          </button>
        ) : (
          <>
            <button className="action-button primary" onClick={handleGetDirections}>
              🗺️ Get Directions
            </button>
            
            {config.showShare && (
              <button className="action-button share-button" onClick={handleOpenShare}>
                📤 Share
              </button>
            )}
            

            
            {config.showDelete && (
              <button 
                className="action-button danger" 
                onClick={() => setShowDeleteConfirm(true)}
              >
                🗑️ Delete
              </button>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation */}
      {config.showDelete && showDeleteConfirm && (
        <div className="delete-confirm" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', zIndex: 1002 }}>
          <p>Are you sure you want to delete this restaurant?</p>
          <div className="confirm-actions">
            <button className="action-button danger" onClick={handleDelete}>
              Yes, Delete
            </button>
            <button 
              className="action-button secondary" 
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {config.showShare && showShareModal && (
        <ShareModal
          restaurant={restaurant}
          friends={friends}
          loading={loadingFriends}
          onShare={handleSharePlace}
          onClose={() => setShowShareModal(false)}
          sharing={sharing}
        />
      )}

      {/* Share Success Modal */}
      {showShareSuccessModal && (
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
        }} onClick={() => setShowShareSuccessModal(false)}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '300px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              fontSize: '48px',
              marginBottom: '16px'
            }}>
              {shareSuccessMessage.includes('Failed') ? '❌' : '📤'}
            </div>
            <h3 style={{
              margin: '0 0 8px 0',
              fontSize: '20px',
              fontWeight: '700',
              color: '#1C1C1E'
            }}>
              {shareSuccessMessage.includes('Failed') ? 'Share Failed' : 'Shared Successfully!'}
            </h3>
            <p style={{
              margin: '0 0 20px 0',
              fontSize: '16px',
              color: '#8E8E93',
              lineHeight: 1.4
            }}>
              {shareSuccessMessage}
            </p>
            <button
              onClick={() => setShowShareSuccessModal(false)}
              style={{
                background: '#007AFF',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              {shareSuccessMessage.includes('Failed') ? 'Try Again' : 'Awesome!'}
            </button>
          </div>
        </div>
      )}
    </div>
  )

  const ModalWrapper = ({ children }) => (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );

  return (
    <>
      {config.isModal ? <ModalWrapper>{DetailContent}</ModalWrapper> : DetailContent}
      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          z-index: 1001;
        }
        .modal {
          background: white;
          border-radius: 20px 20px 0 0;
          width: 100%;
          max-width: 600px;
          max-height: 85vh;
          overflow-y: auto;
          padding: 20px;
          padding-bottom: calc(90px + env(safe-area-inset-bottom));
        }
        .detail-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 16px;
          border-bottom: 1px solid #e2e8f0;
        }
        .detail-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0;
        }
        .detail-section {
          margin-bottom: ${config.reducePadding ? '24px' : '20px'};
        }
        .section-title {
          font-size: 1.2rem;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .detail-item {
          margin-bottom: ${config.reducePadding ? '14px' : '12px'};
        }
        .detail-item:last-child {
          margin-bottom: 0;
        }
        .address-contact-section {
          margin-top: ${config.reducePadding ? '13px' : '20px'};
        }
        .item-label {
          font-weight: 600;
        }
        .item-value {
          margin-top: 4px;
        }
        .contact-link {
          color: #3b82f6;
          text-decoration: none;
        }
        .contact-link:hover {
          text-decoration: underline;
        }
        .detail-photos {
          margin-bottom: 20px;
        }
        .photos-grid {
          display: flex;
          gap: 10px;
        }
        .restaurant-photo {
          width: 100px;
          height: 100px;
          object-fit: cover;
          border-radius: 8px;
        }
        .detail-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
        .action-button {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          flex: 1;
          min-width: 0;
        }
        .primary {
          background: #3b82f6;
          color: white;
        }
        .share-button {
          background: #10b981;
          color: white;
        }
        .secondary {
          background: #e2e8f0;
          color: #3b82f6;
        }
        .danger {
          background: #ef4444;
          color: white;
        }
        .add-button {
          background: #10b981;
          color: white;
          font-size: 16px;
          padding: 12px 24px;
          width: 100%;
          margin-bottom: 35px;
        }
        .delete-confirm {
          margin-top: 20px;
          padding: 16px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
        }
        .confirm-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
        .open-status {
          margin-top: 8px;
          padding: 4px 8px;
          border-radius: 6px;
          font-weight: 600;
        }
        .open {
          background: #d1fae5;
          color: #15803d;
        }
        .closed {
          background: #fef2f2;
          color: #b91c1c;
        }
        .restaurant-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .tag {
          background: #eff6ff;
          color: #3b82f6;
          padding: 4px 8px;
          border-radius: 8px;
          font-size: 0.9em;
        }
        .restaurant-detail-content {
          padding-left: ${config.reducePadding ? '0px' : '10px'};
          padding-right: ${config.reducePadding ? '0px' : '10px'};
        }
        @media (min-width: 768px) {
          .restaurant-detail-content {
            padding-left: ${config.reducePadding ? '0px' : '30px'};
            padding-right: ${config.reducePadding ? '0px' : '30px'};
          }
        }
        
        /* Share Modal Styles */
        .share-modal-fullscreen {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: white;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          padding: 16px;
          box-sizing: border-box;
        }
        
        .share-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #e2e8f0;
          position: sticky;
          top: 0;
          background: white;
          z-index: 1;
        }
        
        .back-button {
          background: none;
          border: none;
          font-size: 16px;
          color: #3b82f6;
          cursor: pointer;
          padding: 8px;
          border-radius: 6px;
          font-weight: 600;
        }
        
        .back-button:hover {
          background: #f1f5f9;
        }
        
        .share-header h3 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
        }
        
        .loading-friends, .no-friends {
          text-align: center;
          padding: 40px 20px;
          color: #64748b;
        }
        
        .friends-list {
          margin-bottom: 16px;
          flex: 1;
          overflow-y: auto;
        }
        
        .friends-header {
          font-weight: 600;
          margin-bottom: 8px;
          color: #1e293b;
          font-size: 0.95rem;
        }
        
        .friend-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          margin-bottom: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .friend-item:hover {
          border-color: #e2e8f0;
          background: #f8fafc;
        }
        
        .friend-item.selected {
          border-color: #3b82f6;
          background: #eff6ff;
          border-width: 2px;
        }
        
        .friend-info {
          display: flex;
          flex-direction: column;
        }
        
        .friend-name {
          font-weight: 600;
          color: #1e293b;
        }
        
        .friend-username {
          font-size: 0.875rem;
          color: #64748b;
        }
        
        .friend-checkbox {
          font-size: 1.25rem;
          color: #3b82f6;
        }
        
        .message-section {
          margin-bottom: 2px;
        }
        
        .message-section label {
          display: block;
          font-weight: 600;
          margin-bottom: 6px;
          color: #1e293b;
          font-size: 0.95rem;
        }
        
        .textarea-container {
          position: relative;
        }
        
        .message-section textarea {
          width: 100%;
          padding: 10px 50px 10px 10px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-family: inherit;
          font-size: 14px;
          resize: vertical;
          outline: none;
          transition: border-color 0.2s;
          box-sizing: border-box;
          min-height: 80px;
        }
        
        .message-section textarea:focus {
          border-color: #3b82f6;
        }
        
        .char-count {
          position: absolute;
          bottom: 8px;
          right: 10px;
          font-size: 0.7rem;
          color: #94a3b8;
          pointer-events: none;
          background: white;
          padding: 0 2px;
        }
        
        .share-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          position: sticky;
          bottom: 0;
          background: white;
          padding: 12px 0 2px 0;
          margin-top: auto;
        }
      `}</style>
    </>
  )
} 