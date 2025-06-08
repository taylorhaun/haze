import React, { useState } from 'react'

export default function DiscoverTab({ onAddRestaurant }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])

  const handleSearch = (e) => {
    e.preventDefault()
    // TODO: Implement Google Places search for nearby restaurants
    alert('Restaurant discovery search coming soon! For now, use the ➕ button to add restaurants from Instagram.')
  }

  const quickActions = [
    { icon: '📷', title: 'From Instagram', subtitle: 'Import from Instagram profile or post', action: onAddRestaurant },
    { icon: '📍', title: 'Nearby Places', subtitle: 'Find restaurants near your location', action: () => alert('Coming soon!') },
    { icon: '🍕', title: 'By Cuisine', subtitle: 'Browse by food type', action: () => alert('Coming soon!') },
    { icon: '⭐', title: 'Top Rated', subtitle: 'Discover highly rated spots', action: () => alert('Coming soon!') }
  ]

  return (
    <div style={{
      paddingBottom: '100px', // Space for bottom nav
      minHeight: '100vh'
    }}>
      {/* Header */}
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
          🔍 Discover
        </h2>
        <p style={{
          margin: '0 0 24px 0',
          fontSize: '16px',
          color: '#8E8E93',
          lineHeight: 1.4
        }}>
          Find new restaurants to add to your collection
        </p>
      </div>

      {/* Search Bar */}
      <div style={{
        padding: '0 20px 24px 20px',
        maxWidth: '500px',
        margin: '0 auto'
      }}>
        <form onSubmit={handleSearch}>
          <div style={{
            position: 'relative'
          }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for restaurants, cuisines, or locations..."
              style={{
                width: '100%',
                padding: '16px 50px 16px 16px',
                border: '1px solid #D1D1D6',
                borderRadius: '12px',
                fontSize: '16px',
                background: 'rgba(255, 255, 255, 0.8)',
                color: '#1C1C1E'
              }}
            />
            <button
              type="submit"
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: '#007AFF',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              🔍
            </button>
          </div>
        </form>
      </div>

      {/* Quick Actions */}
      <div style={{
        padding: '0 20px',
        maxWidth: '500px',
        margin: '0 auto'
      }}>
        <h3 style={{
          margin: '0 0 16px 0',
          fontSize: '18px',
          fontWeight: '600',
          color: '#1C1C1E'
        }}>
          Quick Actions
        </h3>
        
        <div style={{
          display: 'grid',
          gap: '12px'
        }}>
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              style={{
                background: 'rgba(255, 255, 255, 0.8)',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '16px',
                padding: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}
              onMouseDown={(e) => {
                e.target.style.transform = 'scale(0.98)'
                e.target.style.background = 'rgba(255, 255, 255, 0.9)'
              }}
              onMouseUp={(e) => {
                e.target.style.transform = 'scale(1)'
                e.target.style.background = 'rgba(255, 255, 255, 0.8)'
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1)'
                e.target.style.background = 'rgba(255, 255, 255, 0.8)'
              }}
            >
              <div style={{
                fontSize: '28px',
                lineHeight: 1
              }}>
                {action.icon}
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{
                  margin: '0 0 4px 0',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#1C1C1E'
                }}>
                  {action.title}
                </h4>
                <p style={{
                  margin: 0,
                  fontSize: '14px',
                  color: '#8E8E93',
                  lineHeight: 1.3
                }}>
                  {action.subtitle}
                </p>
              </div>
              <div style={{
                color: '#8E8E93',
                fontSize: '18px'
              }}>
                →
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Coming Soon Notice */}
      <div style={{
        margin: '32px 20px 0 20px',
        maxWidth: '500px',
        marginLeft: 'auto',
        marginRight: 'auto',
        padding: '16px',
        background: 'rgba(255, 149, 0, 0.1)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 149, 0, 0.2)'
      }}>
        <p style={{
          margin: 0,
          fontSize: '14px',
          color: '#FF8C00',
          textAlign: 'center',
          lineHeight: 1.4
        }}>
          🚧 More discovery features coming soon! For now, the Instagram import (➕ button) is the best way to add restaurants.
        </p>
      </div>
    </div>
  )
} 