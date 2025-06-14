import React from 'react'

export default function ProfileTab({ session, onSignOut }) {
  return (
    <div style={{
      padding: '20px',
      paddingBottom: '100px', // Space for bottom nav
      maxWidth: '500px',
      margin: '0 auto'
    }}>
      {/* User Info */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.8)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '20px',
        border: '1px solid rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '16px'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #007AFF, #5AC8FA)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            color: 'white'
          }}>
            👤
          </div>
          <div>
            <h3 style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: '600',
              color: '#1C1C1E'
            }}>
              {session?.user?.email || 'User'}
            </h3>
            <p style={{
              margin: '4px 0 0 0',
              fontSize: '14px',
              color: '#8E8E93'
            }}>
              haze member
            </p>
          </div>
        </div>
      </div>

      {/* Feedback Button */}
      <a
        href="https://airtable.com/apparNXwegaXpS5Pn/pagmXeuD4LhVx1ICb/form"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'block',
          width: '100%',
          background: '#3b82f6',
          color: 'white',
          borderRadius: '12px',
          padding: '16px',
          fontSize: '16px',
          fontWeight: 600,
          textAlign: 'center',
          textDecoration: 'none',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(59,130,246,0.10)',
          transition: 'background 0.2s',
        }}
      >
        💬 Give feedback
      </a>

      {/* Sign Out Button */}
      <button
        onClick={onSignOut}
        style={{
          width: '100%',
          background: '#FF3B30',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          padding: '16px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        onMouseDown={(e) => {
          e.target.style.transform = 'scale(0.98)'
          e.target.style.background = '#E60026'
        }}
        onMouseUp={(e) => {
          e.target.style.transform = 'scale(1)'
          e.target.style.background = '#FF3B30'
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)'
          e.target.style.background = '#FF3B30'
        }}
      >
        🚪 Sign Out
      </button>
    </div>
  )
} 