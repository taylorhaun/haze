import React from 'react'

export default function RestaurantList({ restaurants }) {
  if (restaurants.length === 0) {
    return (
      <div className="restaurant-list">
        <div className="loading">
          No restaurants saved yet. Add some restaurants to get started!
        </div>
      </div>
    )
  }

  return (
    <div className="restaurant-list">
      {restaurants.map((savedRec) => {
        const restaurant = savedRec.restaurants
        
        return (
          <div key={savedRec.id} className="restaurant-item">
            <div className="restaurant-name">
              {restaurant?.name || 'Unknown Restaurant'}
            </div>
            <div className="restaurant-address">
              {restaurant?.address || 'No address available'}
            </div>
            
            {savedRec.user_notes && (
              <div style={{ margin: '8px 0', color: '#475569' }}>
                {savedRec.user_notes}
              </div>
            )}
            
            {savedRec.tags && savedRec.tags.length > 0 && (
              <div className="restaurant-tags">
                {savedRec.tags.map((tag, index) => (
                  <span key={index} className="tag">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            
            <div className="restaurant-meta">
              <span>{savedRec.source_type || 'manual'}</span>
              <span>{new Date(savedRec.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
} 