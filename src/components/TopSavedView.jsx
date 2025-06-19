import React, { useState, useEffect } from 'react'

export default function TopSavedView({ supabase, session, onClose, onAddToMyList }) {
  const [topSaved, setTopSaved] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [myRestaurantIds, setMyRestaurantIds] = useState(new Set())
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [addedRestaurantName, setAddedRestaurantName] = useState('')

  // Categories for filtering
  const categories = [
    { id: 'all', name: 'All', emoji: '🌟' },
    { id: 'italian', name: 'Italian', emoji: '🍝' },
    { id: 'asian', name: 'Asian', emoji: '🍜' },
    { id: 'mexican', name: 'Mexican', emoji: '🌮' },
    { id: 'brunch', name: 'Brunch', emoji: '🥞' },
    { id: 'coffee', name: 'Coffee', emoji: '☕' },
    { id: 'pizza', name: 'Pizza', emoji: '🍕' }
  ]

  useEffect(() => {
    const loadData = async () => {
      await fetchMyRestaurants()
      fetchTopSaved()
    }
    loadData()
  }, [])

  const fetchMyRestaurants = async () => {
    try {
      const { data, error } = await supabase
        .from('saved_recs')
        .select('restaurant_id')
        .eq('user_id', session.user.id)

      if (error) throw error
      setMyRestaurantIds(new Set(data.map(rec => rec.restaurant_id)))
    } catch (err) {
      console.error('Error fetching my restaurants:', err)
    }
  }

  const fetchTopSaved = async () => {
    setLoading(true)
    try {
      // Get aggregated restaurant data with save counts
      const { data, error } = await supabase
        .rpc('get_top_saved_restaurants', { min_saves: 1 }) // Testing threshold - any saved restaurant shows up

      if (error) throw error
      
      // Add trend indicators and check if already saved
      const enrichedData = data.map((restaurant, index) => ({
        ...restaurant,
        trend: index < 3 ? 'hot' : index < 10 ? 'trending' : 'popular',
        isAlreadySaved: myRestaurantIds.has(restaurant.id)
      }))

      setTopSaved(enrichedData)
    } catch (err) {
      console.error('Error fetching top saved:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredRestaurants = topSaved.filter(restaurant => {
    if (selectedCategory === 'all') return true
    
    // Simple category matching based on popular tags or name
    const restaurantText = `${restaurant.name} ${restaurant.popular_tags?.join(' ') || ''}`.toLowerCase()
    return restaurantText.includes(selectedCategory)
  })

  const getTrendEmoji = (trend) => {
    switch (trend) {
      case 'hot': return '🔥'
      case 'trending': return '📈'
      default: return '⭐'
    }
  }

  const handleAddToMyList = async (restaurant) => {
    try {
      // Check if restaurant already exists in restaurants table
      const { data: existingRestaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('id', restaurant.id)
        .single()

      let restaurantId = restaurant.id

      // If restaurant doesn't exist in user's database, create it
      if (!existingRestaurant) {
        const { data: newRestaurant, error: insertError } = await supabase
          .from('restaurants')
          .insert([{
            name: restaurant.name,
            address: restaurant.address,
            latitude: restaurant.latitude,
            longitude: restaurant.longitude,
            rating: restaurant.rating,
            price_level: restaurant.price_level
          }])
          .select()
          .single()

        if (insertError) throw insertError
        restaurantId = newRestaurant.id
      }

      // Add to user's saved list
      const { error } = await supabase
        .from('saved_recs')
        .insert([{
          user_id: session.user.id,
          restaurant_id: restaurantId,
          source_type: 'top_saved',
          tags: ['trending', 'community-favorite']
        }])

      if (error) throw error

      // Update local state
      setMyRestaurantIds(prev => new Set([...prev, restaurantId]))
      
      // Update the restaurant's isAlreadySaved status in the topSaved list
      setTopSaved(prev => prev.map(r => 
        r.id === restaurant.id 
          ? { ...r, isAlreadySaved: true }
          : r
      ))
      
      // Notify parent
      if (onAddToMyList) onAddToMyList(restaurant)

      // Show success modal
      setAddedRestaurantName(restaurant.name)
      setShowSuccessModal(true)

    } catch (err) {
      console.error('Error adding restaurant:', err)
      alert('Failed to add restaurant: ' + err.message)
    }
  }

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'white',
        zIndex: 3000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
          <p style={{ color: '#6b7280' }}>Loading community favorites...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'white',
        zIndex: 3000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h3 style={{ margin: '0 0 8px 0', color: '#dc2626' }}>Unable to load Top Saved</h3>
          <p style={{ color: '#6b7280', marginBottom: '20px' }}>{error}</p>
          <button 
            onClick={onClose}
            style={{
              background: '#007AFF',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 24px',
              cursor: 'pointer'
            }}
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'white',
      zIndex: 3000,
      overflowY: 'auto',
      paddingBottom: 'calc(100px + env(safe-area-inset-bottom))'
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid #f3f4f6',
        padding: '20px',
        zIndex: 100
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: '500px',
          margin: '0 auto'
        }}>
          <div>
            <h2 style={{
              margin: '0 0 4px 0',
              fontSize: '24px',
              fontWeight: '700',
              color: '#1C1C1E'
            }}>
              ⭐ Top Saved
            </h2>

          </div>
          <button
            onClick={onClose}
            style={{
              background: '#f3f4f6',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '18px',
              color: '#6b7280'
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Category Filter */}
      <div style={{
        padding: '6px 10px 7px 10px',
        maxWidth: '500px',
        margin: '0 auto'
      }}>
        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '4px'
        }}>
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              style={{
                background: selectedCategory === category.id ? '#007AFF' : '#f1f5f9',
                color: selectedCategory === category.id ? 'white' : '#64748b',
                border: 'none',
                borderRadius: '20px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>{category.emoji}</span>
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Top Saved List */}
      <div style={{
        padding: '0 10px',
        maxWidth: '500px',
        margin: '0 auto'
      }}>
        {filteredRestaurants.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#8E8E93'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
            <p>No places found in this category</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
                         {filteredRestaurants.map((restaurant, index) => (
               <div
                 key={restaurant.id}
                 style={{
                   background: 'white',
                   border: '1px solid #f1f5f9',
                   borderRadius: '12px',
                   padding: '12px',
                   boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                   position: 'relative'
                 }}
               >
                 {/* Header Row - Name, Ranking, Add Button */}
                 <div style={{
                   display: 'flex',
                   alignItems: 'flex-start',
                   justifyContent: 'space-between',
                   marginBottom: '6px'
                 }}>
                   <h3 style={{
                     margin: 0,
                     fontSize: '16px',
                     fontWeight: '600',
                     color: '#1f2937',
                     flex: 1,
                     paddingRight: '8px'
                   }}>
                     {restaurant.name}
                   </h3>
                   
                   <div style={{
                     display: 'flex',
                     alignItems: 'center',
                     gap: '8px'
                   }}>
                     {/* Ranking Badge */}
                     <div style={{
                       display: 'flex',
                       alignItems: 'center',
                       gap: '3px'
                     }}>
                       <span style={{ fontSize: '10px' }}>{getTrendEmoji(restaurant.trend)}</span>
                       <span style={{
                         background: '#f3f4f6',
                         color: '#64748b',
                         fontSize: '10px',
                         fontWeight: '600',
                         padding: '1px 5px',
                         borderRadius: '6px'
                       }}>
                         #{index + 1}
                       </span>
                     </div>

                     {/* Compact Add Button */}
                     <button
                       onClick={() => handleAddToMyList(restaurant)}
                       disabled={restaurant.isAlreadySaved}
                       style={{
                         background: restaurant.isAlreadySaved ? '#f1f5f9' : '#007AFF',
                         color: restaurant.isAlreadySaved ? '#8e8e93' : 'white',
                         border: 'none',
                         borderRadius: '8px',
                         padding: '4px 8px',
                         fontSize: '11px',
                         fontWeight: '600',
                         cursor: restaurant.isAlreadySaved ? 'not-allowed' : 'pointer',
                         whiteSpace: 'nowrap'
                       }}
                     >
                       {restaurant.isAlreadySaved ? '✅' : '➕'}
                     </button>
                   </div>
                 </div>

                 {/* Address - Single Line */}
                 {restaurant.address && (
                   <p style={{
                     margin: '0 0 6px 0',
                     fontSize: '13px',
                     color: '#6b7280',
                     whiteSpace: 'nowrap',
                     overflow: 'hidden',
                     textOverflow: 'ellipsis'
                   }}>
                     📍 {restaurant.address.split(',').slice(0, 2).join(', ')}
                   </p>
                 )}

                                    {/* Stats and Tags Row */}
                   <div style={{
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'space-between',
                     gap: '8px'
                   }}>
                     {/* Stats */}
                     <div style={{
                       display: 'flex',
                       alignItems: 'center',
                       gap: '8px',
                       flex: 1
                     }}>
                       <span style={{
                         background: '#fef3c7',
                         color: '#d97706',
                         fontSize: '11px',
                         fontWeight: '600',
                         padding: '2px 6px',
                         borderRadius: '6px'
                       }}>
                         💾 {restaurant.save_count}
                       </span>
                       
                       {restaurant.rating && (
                         <span style={{
                           fontSize: '12px',
                           color: '#64748b'
                         }}>
                           ⭐ {restaurant.rating}
                         </span>
                       )}
                     </div>

                     {/* Tags - Show More */}
                     {restaurant.popular_tags && restaurant.popular_tags.length > 0 && (
                       <div style={{
                         display: 'flex',
                         gap: '3px',
                         overflow: 'hidden',
                         maxWidth: '180px',
                         flexShrink: 0
                       }}>
                         {restaurant.popular_tags.slice(0, 3).map((tag, tagIndex) => (
                           <span
                             key={tagIndex}
                             style={{
                               background: '#eff6ff',
                               color: '#3b82f6',
                               fontSize: '10px',
                               fontWeight: '500',
                               padding: '1px 6px',
                               borderRadius: '8px',
                               whiteSpace: 'nowrap',
                               overflow: 'hidden',
                               textOverflow: 'ellipsis',
                               maxWidth: '80px'
                             }}
                           >
                             {tag}
                           </span>
                         ))}
                       </div>
                     )}
                   </div>
               </div>
             ))}
          </div>
        )}
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
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
          zIndex: 4000,
          padding: '20px'
        }} onClick={() => setShowSuccessModal(false)}>
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
              ✅
            </div>
            <h3 style={{
              margin: '0 0 8px 0',
              fontSize: '20px',
              fontWeight: '700',
              color: '#1C1C1E'
            }}>
              Added to Your List!
            </h3>
            <p style={{
              margin: '0 0 20px 0',
              fontSize: '16px',
              color: '#8E8E93',
              lineHeight: 1.4
            }}>
              {addedRestaurantName} has been saved to your collection.
            </p>
            <button
              onClick={() => setShowSuccessModal(false)}
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
              Awesome!
            </button>
          </div>
        </div>
      )}
    </div>
  )
} 