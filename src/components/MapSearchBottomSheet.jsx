import React, { useState, useEffect, useRef } from 'react'

export default function MapSearchBottomSheet({ 
  isVisible, 
  onClose, 
  restaurants, 
  searchQuery,
  onRestaurantSelect,
  height,
  onHeightChange
}) {
  const [filteredResults, setFilteredResults] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [startY, setStartY] = useState(0)
  const [startHeight, setStartHeight] = useState(0)
  const bottomSheetRef = useRef(null)

  // Filter restaurants based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredResults(restaurants)
      return
    }
    
    const query = searchQuery.toLowerCase()
    const filtered = restaurants.filter(savedRec => 
      savedRec.restaurants?.name?.toLowerCase().includes(query) ||
      (savedRec.tags && savedRec.tags.some(tag => tag.toLowerCase().includes(query)))
    )
    setFilteredResults(filtered)
  }, [searchQuery, restaurants])

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
    
    const deltaY = startY - clientY // Negative when dragging up, positive when dragging down
    const windowHeight = window.innerHeight
    const deltaVh = (deltaY / windowHeight) * 100 // Convert to vh units
    
    let newHeight = startHeight + deltaVh
    
    // Constrain between 15vh and 95vh for much higher dragging
    newHeight = Math.max(15, Math.min(95, newHeight))
    
    onHeightChange(`${newHeight}vh`)
  }

  // Handle drag end with more snap positions
  const handleDragEnd = () => {
    if (!isDragging) return
    setIsDragging(false)
    
    const currentHeight = parseInt(height.replace('vh', ''))
    console.log('🎯 Drag ended at height:', currentHeight + 'vh')
    
    // Enhanced snap positions for better UX - but let's keep it where the user dragged it
    // Commenting out the auto-snapping for now to see if that's the issue
    /*
    let snapHeight
    if (currentHeight < 25) {
      onClose() // Close if dragged too low
      return
    } else if (currentHeight < 35) {
      onHeightChange('20vh') // Peek view
    } else if (currentHeight < 55) {
      onHeightChange('45vh') // Half screen
    } else if (currentHeight < 75) {
      onHeightChange('65vh') // Three quarters
    } else if (currentHeight < 90) {
      onHeightChange('85vh') // Almost full
    } else {
      onHeightChange('95vh') // Near full screen (leaves space for status bar)
    }
    */
    
    // For now, just keep it where the user dragged it
    console.log('🎯 Keeping height at:', height)
  }

  // Mouse events
  const handleMouseDown = (e) => {
    e.preventDefault()
    handleDragStart(e.clientY)
  }

  // Touch events
  const handleTouchStart = (e) => {
    e.preventDefault()
    handleDragStart(e.touches[0].clientY)
  }

  // Add global event listeners for drag
  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (!isDragging) return
      e.preventDefault()
      handleDragMove(e.clientY)
    }

    const handleGlobalMouseUp = () => {
      if (!isDragging) return
      handleDragEnd()
    }

    const handleGlobalTouchMove = (e) => {
      if (!isDragging) return
      e.preventDefault()
      handleDragMove(e.touches[0].clientY)
    }

    const handleGlobalTouchEnd = () => {
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
  }, [isDragging, onHeightChange])

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
      {/* Draggable Handle */}
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

      {/* Header */}
      <div style={{
        padding: '0 20px 16px 20px',
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
            {searchQuery.trim() ? `"${searchQuery}" Results` : 'Your Restaurants'}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              color: '#6b7280',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            ✕
          </button>
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <p style={{
            margin: '4px 0 0 0',
            fontSize: '14px',
            color: '#6b7280'
          }}>
            {filteredResults.length} restaurant{filteredResults.length !== 1 ? 's' : ''} found
          </p>
          {/* Height indicator for very tall modes */}
          {parseInt(height.replace('vh', '')) > 80 && (
            <span style={{
              fontSize: '12px',
              color: '#9ca3af',
              background: '#f3f4f6',
              padding: '2px 8px',
              borderRadius: '12px'
            }}>
              Full View
            </span>
          )}
        </div>
      </div>

      {/* Results */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px 0'
      }}>
        {filteredResults.length === 0 ? (
          <div style={{
            padding: '40px 20px',
            textAlign: 'center',
            color: '#6b7280'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
            <h4 style={{ margin: '0 0 8px 0', color: '#374151' }}>No results found</h4>
            <p style={{ margin: 0 }}>Try a different search term</p>
          </div>
        ) : (
          filteredResults.map((savedRec) => (
            <div
              key={savedRec.id}
              onClick={() => onRestaurantSelect(savedRec)}
              style={{
                padding: '12px 20px',
                borderBottom: '1px solid #f9fafb',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                ':hover': {
                  backgroundColor: '#f9fafb'
                }
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                {/* Restaurant Icon */}
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  background: '#f3f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px'
                }}>
                  🍽️
                </div>

                {/* Restaurant Info */}
                <div style={{ flex: 1 }}>
                  <h4 style={{
                    margin: '0 0 4px 0',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#1f2937'
                  }}>
                    {savedRec.restaurants?.name || 'Unknown Restaurant'}
                  </h4>
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '4px'
                  }}>
                    {savedRec.restaurants?.rating && (
                      <span style={{
                        fontSize: '14px',
                        color: '#6b7280'
                      }}>
                        ⭐ {savedRec.restaurants.rating}
                      </span>
                    )}
                    <span style={{
                      fontSize: '12px',
                      color: '#9ca3af',
                      background: '#f3f4f6',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>
                      {savedRec.source_type === 'instagram' ? '📷 Instagram' : '✏️ Manual'}
                    </span>
                  </div>

                  {/* Tags */}
                  {savedRec.tags && savedRec.tags.length > 0 && (
                    <div style={{
                      display: 'flex',
                      gap: '4px',
                      flexWrap: 'wrap'
                    }}>
                      {savedRec.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          style={{
                            fontSize: '12px',
                            color: '#3b82f6',
                            background: '#eff6ff',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                      {savedRec.tags.length > 3 && (
                        <span style={{
                          fontSize: '12px',
                          color: '#6b7280'
                        }}>
                          +{savedRec.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Arrow */}
                <div style={{
                  color: '#d1d5db',
                  fontSize: '16px'
                }}>
                  →
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
} 