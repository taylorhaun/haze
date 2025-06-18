import React, { useState, useEffect, useRef } from 'react'
import RestaurantDetail from './RestaurantDetail'

export default function UnifiedBottomSheet({ 
  isVisible,
  onClose,
  type, // 'search' or 'restaurant'
  
  // Search props
  restaurants = [],
  searchQuery = '',
  onRestaurantSelect,
  
  // Restaurant detail props
  restaurant,
  savedRec,
  onDelete,
  onEdit,
  supabase,
  
  // Shared props
  height,
  onHeightChange
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [startY, setStartY] = useState(0)
  const [startHeight, setStartHeight] = useState(0)
  const [filteredResults, setFilteredResults] = useState([])
  const bottomSheetRef = useRef(null)

  // Filter restaurants for search results
  useEffect(() => {
    if (type === 'search') {
      if (!searchQuery.trim()) {
        setFilteredResults(restaurants)
        return
      }
      
      const query = searchQuery.toLowerCase()
      const filtered = restaurants.filter(savedRec => 
        // Search in restaurant name
        savedRec.restaurants?.name?.toLowerCase().includes(query) ||
        // Search in personal notes
        savedRec.user_notes?.toLowerCase().includes(query) ||
        // Search in tags
        (savedRec.tags && savedRec.tags.some(tag => tag.toLowerCase().includes(query)))
      )
      setFilteredResults(filtered)
    }
  }, [restaurants, searchQuery, type])

  // Handle drag start
  const handleDragStart = (clientY) => {
    setIsDragging(true)
    setStartY(clientY)
    const currentHeight = parseInt(height.replace('vh', ''))
    setStartHeight(currentHeight)
  }

  // Handle drag move
  const handleDragMove = (clientY) => {
    if (!isDragging) return
    
    const deltaY = startY - clientY
    const windowHeight = window.innerHeight
    const deltaVh = (deltaY / windowHeight) * 100
    
    let newHeight = startHeight + deltaVh
    newHeight = Math.max(15, Math.min(95, newHeight))
    
    onHeightChange(`${newHeight}vh`)
  }

  // Handle drag end with snapping for BOTH types
  const handleDragEnd = () => {
    console.log('🔥 handleDragEnd called, isDragging:', isDragging)
    if (!isDragging) return
    setIsDragging(false)
    
    const currentHeight = parseInt(height.replace('vh', ''))
    console.log('🎯 Drag ended at height:', currentHeight + 'vh')
    
    // Smart snapping for both search and restaurant views
    if (currentHeight < 25) {
      console.log('🎯 Snapping: Close (too low)')
      onClose() // Close if dragged too low
      return
    } else if (currentHeight < 35) {
      console.log('🎯 Snapping: 20vh peek view')
      onHeightChange('20vh') // Peek view
    } else if (currentHeight < 55) {
      console.log('🎯 Snapping: 45vh half screen')
      onHeightChange('45vh') // Half screen  
    } else if (currentHeight < 75) {
      console.log('🎯 Snapping: 65vh three quarters')
      onHeightChange('65vh') // Three quarters
    } else if (currentHeight < 90) {
      console.log('🎯 Snapping: 85vh almost full')
      onHeightChange('85vh') // Almost full
    } else {
      console.log('🎯 Snapping: 95vh near full screen')
      onHeightChange('95vh') // Near full screen
    }
    
    console.log('🎯 Snapped to position')
  }

  // Mouse and touch event handlers
  const handleMouseDown = (e) => {
    e.preventDefault()
    handleDragStart(e.clientY)
  }

  const handleTouchStart = (e) => {
    e.preventDefault()
    handleDragStart(e.touches[0].clientY)
  }

  // Global event listeners
  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (!isDragging) return
      e.preventDefault()
      handleDragMove(e.clientY)
    }

    const handleGlobalMouseUp = () => {
      console.log('🔥 Global mouse up triggered, isDragging:', isDragging)
      if (!isDragging) return
      handleDragEnd()
    }

    const handleGlobalTouchMove = (e) => {
      if (!isDragging) return
      e.preventDefault()
      handleDragMove(e.touches[0].clientY)
    }

    const handleGlobalTouchEnd = () => {
      console.log('🔥 Global touch end triggered, isDragging:', isDragging)
      if (!isDragging) return
      handleDragEnd()
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove)
      document.addEventListener('mouseup', handleGlobalMouseUp)
      document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false })
      document.addEventListener('touchend', handleGlobalTouchEnd)
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove)
        document.removeEventListener('mouseup', handleGlobalMouseUp)
        document.removeEventListener('touchmove', handleGlobalTouchMove)
        document.removeEventListener('touchend', handleGlobalTouchEnd)
      }
    }
  }, [isDragging, onHeightChange, height, onClose])

  if (!isVisible) return null

  return (
    <div 
      ref={bottomSheetRef}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'white',
        borderTopLeftRadius: '16px',
        borderTopRightRadius: '16px',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
        height: height,
        zIndex: 2000,
        transition: isDragging ? 'none' : 'height 0.3s ease-in-out',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Unified Draggable Handle */}
      <div 
        style={{
          padding: '8px 0 16px 0',
          cursor: isDragging ? 'grabbing' : 'grab',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          userSelect: 'none',
          transition: isDragging ? 'none' : 'all 0.2s ease'
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div style={{
          width: '36px',
          height: '4px',
          background: isDragging ? '#9ca3af' : '#d1d5db',
          borderRadius: '2px',
          transition: 'background-color 0.2s',
          transform: isDragging ? 'scaleY(1.5)' : 'scaleY(1)'
        }} />
      </div>

      {/* Unified Header */}
      <div style={{
        padding: '0 10px 16px 10px',
        borderBottom: '1px solid #f3f4f6',
        flexShrink: 0
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: '600',
            color: '#1f2937'
          }}>
            {type === 'search' 
              ? (searchQuery.trim() ? `"${searchQuery}" Results` : 'Your Places')
              : 'Place Details'
            }
          </h3>
          {/* Unified Close Button - Always gray/black */}
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              color: '#6b7280', // Consistent gray color
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            ✕
          </button>
        </div>
        
        {/* Dynamic Subtitle */}
        {type === 'search' && (
          <p style={{
            margin: '4px 0 0 0',
            fontSize: '14px',
            color: '#6b7280'
          }}>
            {filteredResults.length} place{filteredResults.length !== 1 ? 's' : ''} found
          </p>
        )}
      </div>

      {/* Dynamic Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden', // Prevent horizontal scrolling
        padding: type === 'search' ? '8px 0' : '0',
        paddingBottom: type === 'restaurant' ? '80px' : '120px', // More space for search results and bottom navigation
        overscrollBehavior: 'contain',
        WebkitOverflowScrolling: 'touch'
      }}>
        {type === 'search' ? (
          // Search Results Content
          filteredResults.length === 0 ? (
            <div style={{
              padding: '40px 10px',
              textAlign: 'center',
              color: '#6b7280'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
              <p>No places found matching "{searchQuery}"</p>
            </div>
          ) : (
            filteredResults.map((savedRec) => (
              <div
                key={savedRec.id}
                onClick={() => onRestaurantSelect(savedRec)}
                style={{
                  padding: '16px 10px',
                  borderBottom: '1px solid #f3f4f6',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#f8fafc'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start'
                }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{
                      margin: '0 0 4px 0',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#1f2937'
                    }}>
                      {savedRec.restaurants?.name}
                    </h4>
                    {savedRec.restaurants?.address && (
                      <p style={{
                        margin: '0 0 8px 0',
                        fontSize: '14px',
                        color: '#6b7280'
                      }}>
                        {savedRec.restaurants.address}
                      </p>
                    )}
                    {savedRec.tags && savedRec.tags.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {savedRec.tags.map((tag, index) => (
                          <span
                            key={index}
                            style={{
                              background: '#eff6ff',
                              color: '#3b82f6',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '500'
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )
        ) : (
          // Restaurant Detail Content
          restaurant && savedRec && (
            <div style={{ 
              padding: '10px',
              paddingTop: '0'
            }}>
              <style>
                {`.restaurant-detail-content .detail-header .close-button { display: none !important; }`}
              </style>
              <RestaurantDetail
                restaurant={restaurant}
                savedRec={savedRec}
                onClose={onClose}
                onDelete={onDelete}
                onEdit={onEdit}
                supabase={supabase}
                isModal={false} // Important: tells RestaurantDetail it's in a bottom sheet, not a modal
              />
            </div>
          )
        )}
      </div>
    </div>
  )
} 