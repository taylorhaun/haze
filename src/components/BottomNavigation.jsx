import React from 'react'

export default function BottomNavigation({ activeTab, onTabChange, onAddRestaurant }) {
  const tabs = [
    { id: 'list', icon: '📋', label: 'List' },
    { id: 'map', icon: '🗺️', label: 'Map' },
    { id: 'add', icon: '➕', label: 'Add', isCenter: true },
    { id: 'search', icon: '🔍', label: 'Discover' },
    { id: 'profile', icon: '👤', label: 'Profile' }
  ]

  const handleTabClick = (tabId) => {
    if (tabId === 'add') {
      onAddRestaurant()
    } else {
      onTabChange(tabId)
    }
  }

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(0, 0, 0, 0.1)',
      paddingBottom: 'env(safe-area-inset-bottom)',
      zIndex: 1000
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '8px 16px 12px 16px',
        maxWidth: '500px',
        margin: '0 auto'
      }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          const isCenter = tab.isCenter

          if (isCenter) {
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                style={{
                  background: '#007AFF',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '56px',
                  height: '56px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0, 122, 255, 0.3)',
                  transition: 'all 0.2s ease',
                  transform: 'translateY(-8px)' // Raised above other tabs
                }}
                onMouseDown={(e) => {
                  e.target.style.transform = 'translateY(-6px) scale(0.95)'
                }}
                onMouseUp={(e) => {
                  e.target.style.transform = 'translateY(-8px) scale(1)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(-8px) scale(1)'
                }}
              >
                {tab.icon}
              </button>
            )
          }

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                padding: '8px 12px',
                borderRadius: '8px',
                transition: 'all 0.2s ease',
                color: isActive ? '#007AFF' : '#8E8E93',
                minWidth: '50px'
              }}
              onMouseDown={(e) => {
                e.target.style.transform = 'scale(0.95)'
              }}
              onMouseUp={(e) => {
                e.target.style.transform = 'scale(1)'
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1)'
              }}
            >
              <span style={{
                fontSize: '22px',
                lineHeight: 1,
                opacity: isActive ? 1 : 0.6
              }}>
                {tab.icon}
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: isActive ? '600' : '400',
                lineHeight: 1,
                opacity: isActive ? 1 : 0.8
              }}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
} 