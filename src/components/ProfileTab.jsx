import React from 'react'
import Container from './ui/Layout/Container'
import PageHeader from './ui/Layout/PageHeader'
import Button from './ui/Button'
import { colors, commonStyles, spacing, typography, borderRadius } from '../styles/tokens'

export default function ProfileTab({ session, onSignOut }) {
  return (
    <Container>
      <PageHeader
        title="Profile"
        icon="👤"
      />

      {/* User Info Card */}
      <div style={{
        ...commonStyles.card.base,
        marginBottom: spacing.xl,
        background: `${colors.background.primary}cc`, // Semi-transparent
        border: `1px solid ${colors.text.tertiary}40`, // Semi-transparent border
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.lg,
        }}>
          {/* Avatar */}
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: borderRadius.full,
            background: colors.gradients.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: typography.size.xxl,
            color: colors.background.primary,
          }}>
            👤
          </div>
          
          {/* User Details */}
          <div>
            <h3 style={{
              margin: 0,
              fontSize: typography.size.lg,
              fontWeight: typography.weight.semibold,
              color: colors.text.primary,
            }}>
              {session?.user?.email || 'User'}
            </h3>
            <p style={{
              margin: `${spacing.xs} 0 0 0`,
              fontSize: typography.size.sm,
              color: colors.text.secondary,
            }}>
              haze member
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: spacing.lg 
      }}>
        {/* Feedback Button */}
        <a
          href="https://airtable.com/apparNXwegaXpS5Pn/pagmXeuD4LhVx1ICb/form"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            ...commonStyles.button.base,
            ...commonStyles.button.primary,
            textDecoration: 'none',
            width: '100%',
          }}
        >
          💬 Give feedback
        </a>

        {/* Sign Out Button */}
        <button
          onClick={onSignOut}
          style={{
            ...commonStyles.button.base,
            background: '#FF3B30',
            color: colors.background.primary,
            border: 'none',
            width: '100%',
            fontSize: typography.size.base,
            fontWeight: typography.weight.semibold,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.target.style.background = '#D70015'
          }}
          onMouseLeave={(e) => {
            e.target.style.background = '#FF3B30'
          }}
        >
          🚪 Sign Out
        </button>
      </div>
    </Container>
  )
} 