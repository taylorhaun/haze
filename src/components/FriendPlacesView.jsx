import React, { useState, useEffect } from 'react'
import RestaurantDetail from './RestaurantDetail'

export default function FriendPlacesView({ friend, session, supabase, onClose }) {
  const [places, setPlaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [selectedSavedRec, setSelectedSavedRec] = useState(null)
  const [showRestaurantDetail, setShowRestaurantDetail] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  // Categories for filtering (extracted from tags)
  const [categories, setCategories] = useState([
    { id: 'all', name: 'All', emoji: '🌟' }
  ])

  useEffect(() => {
    fetchFriendPlaces()
  }, [friend.friend_id])

  const fetchFriendPlaces = async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('🔍 Fetching places for friend:', friend.profiles.display_name)
      
      // Query friend's saved places that are visible to friends
      const { data, error } = await supabase
        .from('saved_recs')
        .select(`
          *,
          restaurants (
            id,
            name,
            address,
            latitude,
            longitude,
            rating,
            price_level,
            phone,
            website,
            hours,
            google_place_id
          )
        `)
        .eq('user_id', friend.friend_id)
        .eq('visibility', 'friends')
        .order('created_at', { ascending: false })

      if (error) throw error

      console.log('🔍 Friend places data:', data)
      setPlaces(data || [])

      // Extract unique categories from tags
      const allTags = new Set()
      data?.forEach(place => {
        if (place.is_public_tags && place.tags) {
          place.tags.forEach(tag => allTags.add(tag.toLowerCase()))
        }
      })

      const dynamicCategories = [
        { id: 'all', name: 'All', emoji: '🌟' },
        ...Array.from(allTags).slice(0, 8).map(tag => ({
          id: tag,
          name: tag.charAt(0).toUpperCase() + tag.slice(1),
          emoji: getCategoryEmoji(tag)
        }))
      ]
      
      setCategories(dynamicCategories)

    } catch (err) {
      console.error('Error fetching friend places:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getCategoryEmoji = (tag) => {
    const emojiMap = {
      'italian': '🍝',
      'asian': '🍜',
      'mexican': '🌮',
      'brunch': '🥞',
      'coffee': '☕',
      'pizza': '🍕',
      'dessert': '🍰',
      'sushi': '🍣',
      'thai': '🥘',
      'indian': '🍛',
      'french': '🥖',
      'american': '🍔',
      'seafood': '🦞',
      'steakhouse': '🥩',
      'vegetarian': '🥗',
      'bakery': '🥐',
      'bar': '🍻',
      'fine-dining': '⭐',
      'casual': '😊',
      'date-night': '💕',
      'family': '👨‍👩‍👧‍👦',
      'quick': '⚡',
      'expensive': '💰',
      'cheap': '💸',
      'lunch': '🥪',
      'dinner': '🍽️',
      'breakfast': '🥞'
    }
    return emojiMap[tag.toLowerCase()] || '🏷️'
  }

  const filteredPlaces = places.filter(place => {
    // Search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase()
      const matchesName = place.restaurants.name.toLowerCase().includes(searchLower)
      const matchesAddress = place.restaurants.address?.toLowerCase().includes(searchLower)
      // NEVER search through personal notes - privacy violation!
      const matchesTags = place.is_public_tags && place.tags?.some(tag => 
        tag.toLowerCase().includes(searchLower)
      )
      
      if (!matchesName && !matchesAddress && !matchesTags) {
        return false
      }
    }

    // Category filter
    if (selectedCategory !== 'all') {
      if (!place.is_public_tags || !place.tags) return false
      return place.tags.some(tag => tag.toLowerCase() === selectedCategory)
    }

    return true
  })

  const handlePlaceClick = async (place) => {
    try {
      setSelectedPlace(place.restaurants)
      setSelectedSavedRec(place)
      setShowRestaurantDetail(true)
    } catch (err) {
      console.error('Error opening place detail:', err)
    }
  }

  const handleCloseRestaurantDetail = () => {
    setShowRestaurantDetail(false)
    setSelectedPlace(null)
    setSelectedSavedRec(null)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const renderTags = (place) => {
    if (!place.is_public_tags || !place.tags || place.tags.length === 0) {
      return null
    }

    return (
      <div className="place-tags">
        {place.tags.slice(0, 3).map(tag => (
          <span key={tag} className="place-tag">{tag}</span>
        ))}
        {place.tags.length > 3 && (
          <span className="place-tag-more">+{place.tags.length - 3}</span>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="friend-places-view">
        <div className="header">
          <button className="back-button" onClick={onClose}>
            ← Back
          </button>
          <h2>Loading...</h2>
        </div>
        <div className="loading-state">
          <div className="loading-spinner">🔄</div>
          <p>Loading {friend.profiles.display_name}'s places...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="friend-places-view">
        <div className="header">
          <button className="back-button" onClick={onClose}>
            ← Back
          </button>
          <h2>Error</h2>
        </div>
        <div className="error-state">
          <div className="error-icon">❌</div>
          <p>Error loading places: {error}</p>
          <button className="retry-button" onClick={fetchFriendPlaces}>
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="friend-places-view">
        <div className="header">
          <button className="back-button" onClick={onClose}>
            ← Back
          </button>
          <div className="header-info">
            <h2>{friend.profiles.display_name}'s Places</h2>
            <p className="place-count">{places.length} saved places</p>
          </div>
        </div>

        {places.length > 0 && (
          <>
            {/* Search */}
            <div className="search-section">
              <input
                type="text"
                placeholder="Search places..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>

            {/* Category Filter */}
            <div className="category-filter">
              <div className="category-tabs">
                {categories.map(category => (
                  <button
                    key={category.id}
                    className={`category-tab ${selectedCategory === category.id ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    {category.emoji} {category.name}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Places List */}
        <div className="places-list">
          {places.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏷️</div>
              <h3>No places shared</h3>
              <p>{friend.profiles.display_name} hasn't shared any places with friends yet.</p>
            </div>
          ) : filteredPlaces.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <h3>No places found</h3>
              <p>No places match your search or filter criteria.</p>
            </div>
          ) : (
            filteredPlaces.map(place => (
              <div
                key={place.id}
                className="place-item"
                onClick={() => handlePlaceClick(place)}
              >
                <div className="place-info">
                  <div className="place-name">{place.restaurants.name}</div>
                  <div className="place-address">{place.restaurants.address}</div>
                  
                  {place.restaurants.rating && (
                    <div className="place-rating">
                      ⭐ {place.restaurants.rating}
                    </div>
                  )}

                  {/* NEVER show personal notes to other users - privacy violation! */}

                  {renderTags(place)}

                  <div className="place-meta">
                    Saved {formatDate(place.created_at)}
                  </div>
                </div>

                <div className="place-arrow">
                  →
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Restaurant Detail Modal */}
      {showRestaurantDetail && selectedPlace && selectedSavedRec && (
        <RestaurantDetail
          restaurant={selectedPlace}
          savedRec={selectedSavedRec}
          session={session}
          supabase={supabase}
          onClose={handleCloseRestaurantDetail}
          mode="readonly"
        />
      )}

      <style>{`
        .friend-places-view {
          padding: 20px;
          max-width: 500px;
          margin: 0 auto;
          min-height: 100vh;
          padding-bottom: 100px;
        }

        .header {
          display: flex;
          align-items: center;
          margin-bottom: 24px;
          gap: 16px;
        }

        .back-button {
          background: #F2F2F7;
          color: #007AFF;
          border: none;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .back-button:hover {
          background: #E5E5EA;
        }

        .header-info h2 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          color: #1C1C1E;
        }

        .place-count {
          margin: 4px 0 0 0;
          color: #8E8E93;
          font-size: 14px;
        }

        .search-section {
          margin-bottom: 20px;
        }

        .search-input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #E5E5EA;
          border-radius: 12px;
          font-size: 16px;
          outline: none;
          transition: border-color 0.2s;
        }

        .search-input:focus {
          border-color: #007AFF;
        }

        .category-filter {
          margin-bottom: 24px;
        }

        .category-tabs {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 8px;
        }

        .category-tab {
          background: #F2F2F7;
          color: #666;
          border: none;
          padding: 8px 12px;
          border-radius: 20px;
          font-size: 14px;
          white-space: nowrap;
          cursor: pointer;
          transition: all 0.2s;
        }

        .category-tab.active {
          background: #007AFF;
          color: white;
        }

        .category-tab:hover:not(.active) {
          background: #E5E5EA;
        }

        .places-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .place-item {
          background: white;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .place-item:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          transform: translateY(-1px);
        }

        .place-info {
          flex: 1;
        }

        .place-name {
          font-size: 18px;
          font-weight: 600;
          color: #1C1C1E;
          margin-bottom: 4px;
        }

        .place-address {
          font-size: 14px;
          color: #8E8E93;
          margin-bottom: 8px;
        }

        .place-rating {
          font-size: 14px;
          color: #FF9500;
          margin-bottom: 8px;
        }

        .place-notes {
          font-size: 14px;
          color: #48484A;
          font-style: italic;
          margin-bottom: 8px;
          padding: 8px 12px;
          background: #F2F2F7;
          border-radius: 8px;
        }

        .place-tags {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-bottom: 8px;
        }

        .place-tag {
          background: #E5F3FF;
          color: #007AFF;
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 12px;
          font-weight: 500;
        }

        .place-tag-more {
          background: #F2F2F7;
          color: #8E8E93;
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 12px;
          font-weight: 500;
        }

        .place-meta {
          font-size: 12px;
          color: #8E8E93;
        }

        .place-arrow {
          color: #C7C7CC;
          font-size: 18px;
          margin-left: 16px;
        }

        .loading-state, .error-state, .empty-state {
          text-align: center;
          padding: 60px 20px;
        }

        .loading-spinner {
          font-size: 32px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .error-icon, .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .loading-state h3, .error-state h3, .empty-state h3 {
          margin: 16px 0 8px 0;
          font-size: 20px;
          color: #1C1C1E;
        }

        .loading-state p, .error-state p, .empty-state p {
          margin: 0;
          color: #8E8E93;
          font-size: 16px;
        }

        .retry-button {
          background: #007AFF;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
          margin-top: 16px;
          transition: all 0.2s;
        }

        .retry-button:hover {
          background: #0056CC;
        }

        @media (max-width: 480px) {
          .friend-places-view {
            padding: 16px;
          }

          .category-tabs {
            gap: 6px;
          }

          .category-tab {
            padding: 6px 10px;
            font-size: 12px;
          }

          .place-item {
            padding: 12px;
          }

          .place-name {
            font-size: 16px;
          }
        }
      `}</style>
    </>
  )
} 