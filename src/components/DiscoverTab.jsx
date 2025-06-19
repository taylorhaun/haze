import React, { useState } from 'react'
import TopSavedView from './TopSavedView'

export default function DiscoverTab({ onAddRestaurant, supabase, session, onRestaurantAdded }) {
  const [showComingSoon, setShowComingSoon] = useState(false)
  const [showTopSaved, setShowTopSaved] = useState(false)

  const quickActions = [
    { icon: '⭐', title: 'Top Saved', subtitle: 'Discover the top saved places on haze.', action: () => setShowTopSaved(true) },
    { icon: '🎯', title: 'Taste Match', subtitle: 'See what places you have in common with your friends', action: () => setShowComingSoon(true) }
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
          Find new places to add to your collection
        </p>
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
          🚧 More discovery features coming soon! For now, the Instagram import (➕ button) is the best way to add places.
        </p>
      </div>

      {/* Coming Soon Modal */}
      {showComingSoon && (
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
          zIndex: 1000,
          padding: '20px'
        }} onClick={() => setShowComingSoon(false)}>
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
              🚧
            </div>
            <h3 style={{
              margin: '0 0 8px 0',
              fontSize: '20px',
              fontWeight: '700',
              color: '#1C1C1E'
            }}>
              Coming Soon!
            </h3>
            <p style={{
              margin: '0 0 20px 0',
              fontSize: '16px',
              color: '#8E8E93',
              lineHeight: 1.4
            }}>
              Taste Match is currently in development. Stay tuned!
            </p>
            <button
              onClick={() => setShowComingSoon(false)}
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
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Top Saved View */}
      {showTopSaved && (
        <TopSavedView
          supabase={supabase}
          session={session}
          onClose={() => setShowTopSaved(false)}
          onAddToMyList={(restaurant) => {
            console.log('Added restaurant from Top Saved:', restaurant)
            if (onRestaurantAdded) onRestaurantAdded()
          }}
        />
      )}
    </div>
  )
} 