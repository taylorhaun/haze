import React, { useState, useEffect } from 'react'
import InstagramImporter from './InstagramImporter'
import RestaurantList from './RestaurantList'
import MapView from './MapView'
import DiscoverTab from './DiscoverTab'
import ProfileTab from './ProfileTab'
import BottomNavigation from './BottomNavigation'
import SearchAndFilter from './SearchAndFilter'
import SocialSetup from './SocialSetup'
import FriendsTab from './FriendsTab'
import ListTab from './pages/ListTab'
import ListsTab from './pages/ListsTab'

export default function RestaurantApp({ session, supabase }) {
  const [restaurants, setRestaurants] = useState([])
  const [filteredRestaurants, setFilteredRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('map') // 'list', 'map', 'search', 'profile'
  const [showImporter, setShowImporter] = useState(false)
  const [userProfile, setUserProfile] = useState(null)
  const [showSocialSetup, setShowSocialSetup] = useState(false)

  // Debug: log state changes
  useEffect(() => {
    console.log('🔍 showSocialSetup state changed:', showSocialSetup)
  }, [showSocialSetup])

  useEffect(() => {
    console.log('🔍 userProfile state changed:', userProfile)
  }, [userProfile])

  useEffect(() => {
    fetchRestaurants()
    checkUserProfile()
  }, [])

  const checkUserProfile = async () => {
    try {
      console.log('🔍 Checking user profile for:', session.user.id)
      console.log('🔍 User email:', session.user.email)
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      console.log('🔍 Profile query result:', { data, error })

      if (error && error.code === 'PGRST116') {
        // No profile found - show setup
        console.log('✅ No profile found - showing social setup')
        setShowSocialSetup(true)
      } else if (data) {
        console.log('✅ Profile found:', data)
        setUserProfile(data)
      } else if (error) {
        console.log('❌ Profile query error:', error)
      }
    } catch (err) {
      console.error('❌ Error checking user profile:', err)
    }
  }

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

  const handleSocialSetupComplete = () => {
    setShowSocialSetup(false)
    checkUserProfile() // Refresh profile data
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
          <ListTab
            restaurants={restaurants}
            filteredRestaurants={filteredRestaurants}
            onFilteredResults={handleFilteredResults}
            onRestaurantDelete={handleRestaurantDelete}
            onRestaurantUpdate={handleRestaurantUpdateInPlace}
            supabase={supabase}
            session={session}
            allTags={getAllTags()}
          />
        )
      
      case 'map':
        return (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflow: 'hidden'
          }}>
            <MapView restaurants={filteredRestaurants} supabase={supabase} session={session} onRestaurantUpdate={handleRestaurantUpdateInPlace} onRestaurantDelete={handleRestaurantDelete} />
          </div>
        )
      
      case 'lists':
        return (
          <ListsTab
            session={session}
            supabase={supabase}
          />
        )
      
      case 'discover':
        return (
          <DiscoverTab
            onAddRestaurant={handleAddRestaurantClick}
            supabase={supabase}
            session={session}
            onRestaurantAdded={handleRestaurantAdded}
          />
        )
      
      case 'friends':
        return (
          <FriendsTab
            session={session}
            supabase={supabase}
            userProfile={userProfile}
          />
        )
      
      case 'profile':
        return (
          <ProfileTab
            session={session}
            onSignOut={handleSignOut}
            userProfile={userProfile}
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

      {/* Social Setup Modal */}
      {showSocialSetup && (
        <SocialSetup
          session={session}
          supabase={supabase}
          onComplete={handleSocialSetupComplete}
        />
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