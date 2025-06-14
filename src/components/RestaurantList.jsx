import React, { useState } from 'react'
import RestaurantDetail from './RestaurantDetail'
import BottomSheet from './BottomSheet'

export default function RestaurantList({ restaurants, onRestaurantUpdate, onRestaurantDelete, supabase }) {
  const [selectedRestaurant, setSelectedRestaurant] = useState(null)
  const [selectedSavedRec, setSelectedSavedRec] = useState(null)

  if (restaurants.length === 0) {
    return (
      <div className="restaurant-list">
        <div className="loading">
          No restaurants saved yet. Add some restaurants to get started!
        </div>
      </div>
    )
  }

  const handleRestaurantClick = (savedRec) => {
    setSelectedSavedRec(savedRec)
    setSelectedRestaurant(savedRec.restaurants)
  }

  const handleCloseDetail = () => {
    setSelectedRestaurant(null)
    setSelectedSavedRec(null)
  }

  const handleEdit = (updatedSavedRec) => {
    setSelectedSavedRec(updatedSavedRec)
    if (onRestaurantUpdate) onRestaurantUpdate(updatedSavedRec)
    console.log('Edit restaurant:', updatedSavedRec)
  }

  const handleDelete = async (savedRecId) => {
    if (onRestaurantDelete) {
      await onRestaurantDelete(savedRecId)
    }
  }

  return (
    <>
      <div className="restaurant-list">
        {restaurants.map((savedRec) => {
          const restaurant = savedRec.restaurants
          
          return (
            <div 
              key={savedRec.id} 
              className="restaurant-item clickable"
              onClick={() => handleRestaurantClick(savedRec)}
            >
              <div className="restaurant-name">
                {restaurant?.name || 'Unknown Restaurant'}
              </div>
              
              {savedRec.user_notes && (
                <div style={{ margin: '6px 0', color: '#475569', fontSize: '0.9rem' }}>
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
              
              {/* Click hint */}
              <div className="click-hint">
                👆 Tap for details
              </div>
            </div>
          )
        })}
      </div>

      {/* Restaurant Detail Bottom Sheet */}
      {selectedRestaurant && selectedSavedRec && (
        <BottomSheet
          open={!!selectedSavedRec}
          onClose={handleCloseDetail}
          defaultHeight="full"
        >
          <RestaurantDetail
            restaurant={selectedRestaurant}
            savedRec={selectedSavedRec}
            onClose={handleCloseDetail}
            onEdit={(updatedSavedRec) => {
              setSelectedSavedRec(updatedSavedRec);
              if (onRestaurantUpdate) onRestaurantUpdate(updatedSavedRec);
            }}
            onDelete={handleDelete}
            supabase={supabase}
            isModal={false}
          />
        </BottomSheet>
      )}

      <style jsx>{`
        .restaurant-item.clickable {
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          padding-left: 20px;
          padding-right: 20px;
        }

        .restaurant-item.clickable:hover {
          background: #f8fafc;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .click-hint {
          position: absolute;
          top: 8px;
          right: 12px;
          font-size: 0.75rem;
          color: #94a3b8;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .restaurant-item.clickable:hover .click-hint {
          opacity: 1;
        }

        /* Mobile - always show click hint */
        @media (max-width: 640px) {
          .click-hint {
            opacity: 1;
            position: static;
            text-align: center;
            margin-top: 8px;
            font-size: 0.8rem;
          }
        }

        @media (min-width: 768px) {
          .restaurant-list {
            padding: 20px;
          }
          .restaurant-item {
            padding-left: 32px;
            padding-right: 32px;
            padding-top: 16px;
            padding-bottom: 16px;
          }
        }
      `}</style>
    </>
  )
} 