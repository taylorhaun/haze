import React, { useState, useEffect } from 'react'
import InstagramImporter from './InstagramImporter'
import RestaurantList from './RestaurantList'
import MapView from './MapView'
import DiscoverTab from './DiscoverTab'
import ProfileTab from './ProfileTab'
import BottomNavigation from './BottomNavigation'
import SearchAndFilter from './SearchAndFilter'

export default function RestaurantApp({ session, supabase }) {
  const [restaurants, setRestaurants] = useState([])
  const [filteredRestaurants, setFilteredRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('map') // 'list', 'map', 'search', 'profile'
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

  const handleAddRestaurantClick = () => {
    console.log('[DEBUG] Plus button clicked, opening importer modal')
    setShowImporter(true)
  }

  const handleRestaurantDelete = async (savedRecId) => {
    try {
      const { error } = await supabase
        .from('saved_recs')
        .delete()
        .eq('id', savedRecId)
        .eq('user_id', session.user.id) // Extra security check

      if (error) throw error
      
      // Remove from local state immediately
      setRestaurants(prev => prev.filter(rec => rec.id !== savedRecId));
      setFilteredRestaurants(prev => prev.filter(rec => rec.id !== savedRecId));
    } catch (error) {
      console.error('Error deleting restaurant:', error)
      alert('Failed to delete restaurant. Please try again.')
    }
  }

  const handleRestaurantUpdateInPlace = (updatedSavedRec) => {
    setRestaurants(prev => prev.map(rec => rec.id === updatedSavedRec.id ? updatedSavedRec : rec));
  };

  const handleFilteredResults = (filtered) => {
    setFilteredRestaurants(filtered)
  }

  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
  }

  const renderCurrentTab = () => {
    if (loading) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '50vh',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #007AFF',
            borderTop: '3px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ color: '#8E8E93', fontSize: '16px' }}>
            Loading your restaurants...
          </p>
        </div>
      )
    }

    switch (activeTab) {
      case 'list':
        return (
          <div style={{ paddingBottom: '100px' }}>
            {/* List Header */}
            <div style={{
              padding: '20px 20px 0 20px',
              maxWidth: '500px',
              margin: '0 auto'
            }}>
              <h2 style={{
                margin: '0 0 16px 0',
                fontSize: '28px',
                fontWeight: '700',
                color: '#1C1C1E'
              }}>
                📋 My Restaurants
              </h2>
              {restaurants.length > 0 && (
                <p style={{
                  margin: '0 0 20px 0',
                  fontSize: '16px',
                  color: '#8E8E93',
                  lineHeight: 1.4
                }}>
                  {restaurants.length} saved restaurant{restaurants.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            {/* Search and Filter for Saved Restaurants */}
            {restaurants.length > 0 && (
              <div style={{
                padding: '0 20px 20px 20px',
                maxWidth: '500px',
                margin: '0 auto'
              }}>
                <SearchAndFilter
                  restaurants={restaurants}
                  onFilteredResults={handleFilteredResults}
                  allTags={getAllTags()}
                />
              </div>
            )}

            {/* Restaurant List */}
            {restaurants.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                color: '#8E8E93'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                <h3 style={{
                  margin: '0 0 8px 0',
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#1C1C1E'
                }}>
                  No restaurants yet
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: '16px',
                  lineHeight: 1.4
                }}>
                  Tap the ➕ button to add your first restaurant from Instagram!
                </p>
              </div>
            ) : (
              <RestaurantList 
                restaurants={filteredRestaurants}
                onRestaurantDelete={handleRestaurantDelete}
                onRestaurantUpdate={handleRestaurantUpdateInPlace}
                supabase={supabase}
              />
            )}
          </div>
        )
      
      case 'map':
        return (
          <MapView restaurants={filteredRestaurants} supabase={supabase} session={session} onRestaurantUpdate={handleRestaurantUpdateInPlace} />
        )
      
      case 'search':
        return (
          <DiscoverTab
            onAddRestaurant={handleAddRestaurantClick}
          />
        )
      
      case 'profile':
        return (
          <ProfileTab
            session={session}
            onSignOut={handleSignOut}
          />
        )
      
      default:
        return null
    }
  }

  return (
    <div className="restaurant-app" style={{ paddingBottom: '100px' }}>
      {/* Main Content */}
      <main className="main-content" style={{ minHeight: '100vh' }}>
        {renderCurrentTab()}
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onAddRestaurant={handleAddRestaurantClick}
      />

      {/* Instagram Importer Modal */}
      {showImporter && (
        <div className="modal-overlay">
          <InstagramImporter
            supabase={supabase}
            session={session}
            onClose={() => setShowImporter(false)}
            onRestaurantAdded={handleRestaurantAdded}
          />
        </div>
      )}

      {/* Loading Animation CSS */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
} 