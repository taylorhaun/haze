import React, { useState, useEffect } from 'react'

export default function RestaurantDetail({ restaurant, savedRec, onClose, onEdit, onDelete }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Prevent body scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.width = '100%'
    
    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }
  }, [])

  if (!restaurant || !savedRec) return null

  // Parse source data for enhanced info
  const sourceData = savedRec.source_data || {}
  const photos = sourceData.photos || []
  const reviews = sourceData.reviews || []
  const hours = restaurant.hours || sourceData.hours

  const handleDelete = () => {
    onDelete(savedRec.id)
    onClose()
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal restaurant-detail-modal" onClick={(e) => e.stopPropagation()}>
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
        {savedRec.user_notes && (
          <div className="detail-section">
            <div className="section-title">📝 Your Notes</div>
            <div className="personal-notes">{savedRec.user_notes}</div>
          </div>
        )}

        {/* Tags */}
        {savedRec.tags && savedRec.tags.length > 0 && (
          <div className="detail-section">
            <div className="section-title">🏷️ Tags</div>
            <div className="restaurant-tags">
              {savedRec.tags.map((tag, index) => (
                <span key={index} className="tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

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

        {/* Source Info */}
        <div className="detail-section">
          <div className="section-title">ℹ️ Source</div>
          <div className="source-info">
            <span className="source-type">
              {savedRec.source_type === 'instagram' ? '📷 Instagram Import' : '✏️ Manual Entry'}
            </span>
            <span className="source-date">
              Added {new Date(savedRec.created_at).toLocaleDateString()}
            </span>
          </div>
          {sourceData.sentiment && (
            <div className="sentiment-info">
              Mood: {sourceData.sentiment}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="detail-actions">
          <button className="action-button primary" onClick={handleGetDirections}>
            🗺️ Get Directions
          </button>
          <button className="action-button secondary" onClick={() => onEdit(savedRec)}>
            ✏️ Edit
          </button>
          <button 
            className="action-button danger" 
            onClick={() => setShowDeleteConfirm(true)}
          >
            🗑️ Delete
          </button>
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="delete-confirm">
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

      <style jsx>{`
        .restaurant-detail-modal {
          max-width: 600px;
          max-height: 90vh;
          padding: 0;
          overflow-y: auto;
          overflow-x: hidden;
          display: flex;
          flex-direction: column;
        }

        .detail-header {
          padding: 20px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          background: white;
          position: sticky;
          top: 0;
          z-index: 10;
          flex-shrink: 0;
        }

        .detail-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 4px 0;
        }

        .detail-rating {
          font-size: 0.9rem;
          color: #64748b;
        }

        .price-level {
          color: #10b981;
          font-weight: 600;
        }

        .close-button {
          background: none;
          border: none;
          font-size: 1.2rem;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          min-width: 32px;
          min-height: 32px;
        }

        .detail-photos {
          padding: 0 20px 20px 20px;
        }

        .photos-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
          margin-top: 16px;
        }

        .restaurant-photo {
          width: 100%;
          height: 120px;
          object-fit: cover;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .detail-section {
          padding: 16px 20px;
          border-bottom: 1px solid #f1f5f9;
        }

        .section-title {
          font-weight: 600;
          color: #374151;
          margin-bottom: 12px;
          font-size: 0.95rem;
        }

        .detail-item {
          margin-bottom: 12px;
        }

        .item-label {
          font-size: 0.85rem;
          color: #64748b;
          margin-bottom: 4px;
        }

        .item-value {
          color: #1e293b;
          line-height: 1.4;
        }

        .contact-link {
          color: #3b82f6;
          text-decoration: none;
          font-weight: 500;
        }

        .contact-link:hover {
          text-decoration: underline;
        }

        .hours-list {
          font-size: 0.9rem;
          line-height: 1.5;
        }

        .hours-item {
          padding: 2px 0;
          color: #374151;
        }

        .open-status {
          margin-top: 8px;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .open-status.open {
          color: #10b981;
        }

        .open-status.closed {
          color: #ef4444;
        }

        .personal-notes {
          background: #f8fafc;
          padding: 12px;
          border-radius: 8px;
          color: #374151;
          line-height: 1.5;
          font-style: italic;
        }

        .reviews-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .review-item {
          background: #f8fafc;
          padding: 12px;
          border-radius: 8px;
        }

        .review-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }

        .review-rating {
          font-weight: 600;
          color: #f59e0b;
        }

        .review-author {
          font-size: 0.85rem;
          color: #64748b;
        }

        .review-text {
          color: #374151;
          line-height: 1.4;
          margin-bottom: 6px;
          font-size: 0.9rem;
        }

        .review-time {
          font-size: 0.8rem;
          color: #64748b;
        }

        .source-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.9rem;
        }

        .source-type {
          color: #374151;
          font-weight: 500;
        }

        .source-date {
          color: #64748b;
        }

        .sentiment-info {
          margin-top: 6px;
          font-size: 0.85rem;
          color: #64748b;
        }

        .detail-actions {
          padding: 20px 20px calc(90px + 20px) 20px; /* Extra bottom padding for bottom nav */
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
        }

        .action-button {
          flex: 1;
          min-width: 140px;
          padding: 12px 16px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.9rem;
        }

        .action-button.primary {
          background: #3b82f6;
          color: white;
        }

        .action-button.primary:hover {
          background: #2563eb;
        }

        .action-button.secondary {
          background: #e2e8f0;
          color: #374151;
        }

        .action-button.secondary:hover {
          background: #cbd5e1;
        }

        .action-button.danger {
          background: #ef4444;
          color: white;
        }

        .action-button.danger:hover {
          background: #dc2626;
        }

        .delete-confirm {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: #fef2f2;
          border: 1px solid #fca5a5;
          padding: 16px 20px;
          text-align: center;
        }

        .delete-confirm p {
          margin-bottom: 12px;
          color: #dc2626;
          font-weight: 500;
        }

        .confirm-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
        }

        .confirm-actions .action-button {
          flex: 0 0 auto;
          min-width: 100px;
        }

        /* Mobile optimizations */
        @media (max-width: 640px) {
          .detail-header {
            padding: 16px;
          }

          .detail-title {
            font-size: 1.25rem;
          }

          .detail-photos {
            padding: 0 16px 16px 16px;
          }

          .photos-grid {
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          }

          .restaurant-photo {
            height: 100px;
          }

          .detail-section {
            padding: 12px 16px;
          }

          .detail-actions {
            padding: 16px 16px calc(90px + 16px) 16px; /* Extra bottom padding for bottom nav */
          }

          .action-button {
            min-width: 120px;
            padding: 10px 12px;
            font-size: 0.85rem;
          }
        }
      `}</style>
    </div>
  )
} 