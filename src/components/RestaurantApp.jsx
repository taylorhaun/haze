import React, { useState, useEffect } from 'react'
import InstagramImporter from './InstagramImporter'
import RestaurantList from './RestaurantList'
import MapView from './MapView'
import SearchAndFilter from './SearchAndFilter'

export default function RestaurantApp({ session, supabase }) {
  const [restaurants, setRestaurants] = useState([])
  const [filteredRestaurants, setFilteredRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('list') // 'list' or 'map'
  const [showImporter, setShowImporter] = useState(false)

  useEffect(() => {
    fetchRestaurants()
  }, [])

  // Update filtered restaurants when main restaurants list changes
  useEffect(() => {
    setFilteredRestaurants(restaurants)
  }, [restaurants])

  const fetchRestaurants = async () => {
    try {
      const { data, error } = await supabase
        .from('saved_recs')
        .select(`
          *,
          restaurants (*)
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setRestaurants(data || [])
    } catch (error) {
      console.error('Error fetching restaurants:', error)
    } finally {
      setLoading(false)
    }
  }

  // Extract all unique tags from restaurants
  const getAllTags = () => {
    const allTags = new Set()
    restaurants.forEach(savedRec => {
      if (savedRec.tags) {
        savedRec.tags.forEach(tag => allTags.add(tag))
      }
    })
    return Array.from(allTags).sort()
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const handleRestaurantAdded = () => {
    fetchRestaurants()
    setShowImporter(false)
  }

  const handleRestaurantDelete = async (savedRecId) => {
    try {
      const { error } = await supabase
        .from('saved_recs')
        .delete()
        .eq('id', savedRecId)
        .eq('user_id', session.user.id) // Extra security check

      if (error) throw error
      
      // Refresh the restaurant list
      fetchRestaurants()
    } catch (error) {
      console.error('Error deleting restaurant:', error)
      alert('Failed to delete restaurant. Please try again.')
    }
  }

  const handleFilteredResults = (filtered) => {
    setFilteredRestaurants(filtered)
  }

  if (loading) {
    return <div className="loading">Loading your restaurants...</div>
  }

  return (
    <div className="restaurant-app">
      {/* Header */}
      <header className="app-header">
        <h1>🌫️ haze</h1>
        <div className="header-actions">
          <button 
            onClick={() => setShowImporter(true)}
            className="add-button"
          >
            ➕ Add Restaurant
          </button>
          <button onClick={handleSignOut} className="sign-out-button">
            🚪
          </button>
        </div>
      </header>

      {/* View Toggle */}
      <div className="view-toggle">
        <button 
          onClick={() => setView('list')}
          className={view === 'list' ? 'active' : ''}
        >
          📋 List
        </button>
        <button 
          onClick={() => setView('map')}
          className={view === 'map' ? 'active' : ''}
        >
          🗺️ Map
        </button>
      </div>

      {/* Search and Filter - Only show in list view */}
      {view === 'list' && restaurants.length > 0 && (
        <div className="search-section">
          <SearchAndFilter
            restaurants={restaurants}
            onFilteredResults={handleFilteredResults}
            allTags={getAllTags()}
          />
        </div>
      )}

      {/* Main Content */}
      <main className="main-content">
        {view === 'list' ? (
          <RestaurantList 
            restaurants={filteredRestaurants} // Use filtered results
            onRestaurantDelete={handleRestaurantDelete}
          />
        ) : (
          <MapView restaurants={filteredRestaurants} /> // Also filter map results
        )}
      </main>

      {/* Instagram Importer Modal */}
      {showImporter && (
        <InstagramImporter
          supabase={supabase}
          session={session}
          onClose={() => setShowImporter(false)}
          onRestaurantAdded={handleRestaurantAdded}
        />
      )}

      <style jsx>{`
        .search-section {
          padding: 0 20px;
          margin-bottom: 4px;
        }

        .results-count {
          padding: 0 20px;
          margin-bottom: 16px;
          font-size: 0.9rem;
          color: #64748b;
          font-weight: 500;
        }

        @media (max-width: 640px) {
          .search-section {
            padding: 0 16px;
          }

          .results-count {
            padding: 0 16px;
            margin-bottom: 12px;
          }
        }
      `}</style>
    </div>
  )
} 