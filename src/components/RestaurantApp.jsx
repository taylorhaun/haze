import React, { useState, useEffect } from 'react'
import { MapPin, Plus, Instagram, Link, LogOut } from 'lucide-react'
import InstagramImporter from './InstagramImporter'
import RestaurantList from './RestaurantList'
import MapView from './MapView'

export default function RestaurantApp({ session, supabase }) {
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('list') // 'list' or 'map'
  const [showImporter, setShowImporter] = useState(false)

  useEffect(() => {
    fetchRestaurants()
  }, [])

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

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const handleRestaurantAdded = () => {
    fetchRestaurants()
    setShowImporter(false)
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
            <Plus size={20} />
            Add Restaurant
          </button>
          <button onClick={handleSignOut} className="sign-out-button">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* View Toggle */}
      <div className="view-toggle">
        <button 
          onClick={() => setView('list')}
          className={view === 'list' ? 'active' : ''}
        >
          List
        </button>
        <button 
          onClick={() => setView('map')}
          className={view === 'map' ? 'active' : ''}
        >
          <MapPin size={16} />
          Map
        </button>
      </div>

      {/* Main Content */}
      <main className="main-content">
        {view === 'list' ? (
          <RestaurantList restaurants={restaurants} />
        ) : (
          <MapView restaurants={restaurants} />
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
    </div>
  )
} 