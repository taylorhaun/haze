import React, { useState, useEffect, useRef } from 'react'

export default function RestaurantDetail({ restaurant, savedRec, onClose, onEdit, onDelete, supabase, isModal = true }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editNotes, setEditNotes] = useState(savedRec.user_notes || '')
  const [editTags, setEditTags] = useState(savedRec.tags || [])
  const notesTextareaRef = useRef(null)
  const tagInputRef = useRef(null)
  const [saving, setSaving] = useState(false)

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
    if (isModal) {
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
      
      return () => {
        document.body.style.overflow = ''
        document.body.style.position = ''
        document.body.style.width = ''
      }
    }
  }, [isModal])

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
      <div className="detail-section">
        {restaurant.address && (
          <div className="detail-item">
            <div className="item-label">📍 Address</div>
            <div className="item-value">{restaurant.address}</div>
          </div>
        )}

        {restaurant.phone && (
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
      {hours && hours.weekdayText && (
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
      <div className="detail-section">
        <div className="section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>📝 Personal Notes</span>
          {!editMode && (
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

      {/* Tags */}
      <div className="detail-section">
        <div className="section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>🏷️ Tags</span>
          {!editMode && (
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

      {/* Reviews */}
      {reviews.length > 0 && (
        <div className="detail-section">
          <div className="section-title">💬 Recent Reviews</div>
          <div className="reviews-list">
            {reviews.slice(0, 2).map((review, index) => (
              <div key={index} className="review-item">
                <div className="review-header">
                  <span className="review-rating">⭐ {review.rating}</span>
                  <span className="review-author">{review.author}</span>
                </div>
                <div className="review-text">{review.text}</div>
                <div className="review-time">{review.time}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="detail-actions">
        <button className="action-button primary" onClick={handleGetDirections}>
          🗺️ Get Directions
        </button>
        {editMode ? (
          <>
            <button className="action-button primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button className="action-button secondary" onClick={() => setEditMode(false)} disabled={saving}>
              Cancel
            </button>
          </>
        ) : (
          <button className="action-button secondary" onClick={() => setEditMode(true)}>
            ✏️ Edit
          </button>
        )}
        <button 
          className="action-button danger" 
          onClick={() => setShowDeleteConfirm(true)}
        >
          🗑️ Delete
        </button>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
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
      {isModal ? <ModalWrapper>{DetailContent}</ModalWrapper> : DetailContent}
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
          margin-bottom: 20px;
        }
        .section-title {
          font-size: 1.2rem;
          font-weight: 600;
          margin-bottom: 8px;
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
        }
        .primary {
          background: #3b82f6;
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
          padding-left: 10px;
          padding-right: 10px;
        }
        @media (min-width: 768px) {
          .restaurant-detail-content {
            padding-left: 30px;
            padding-right: 30px;
          }
        }
      `}</style>
    </>
  )
} 