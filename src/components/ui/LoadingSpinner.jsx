import React from 'react'
import { colors, spacing, typography } from '../../styles/tokens'

export default function LoadingSpinner({ 
  size = 'medium', 
  message = 'Loading...',
  showMessage = true,
  inline = false 
}) {
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { width: '24px', height: '24px', borderWidth: '2px' }
      case 'large':
        return { width: '48px', height: '48px', borderWidth: '4px' }
      default:
        return { width: '32px', height: '32px', borderWidth: '3px' }
    }
  }

  const containerStyles = inline ? {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing.sm,
  } : {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: spacing.lg,
    minHeight: inline ? 'auto' : '200px',
    padding: spacing.xl,
  }

  const spinnerStyles = {
    ...getSizeStyles(),
    border: `${getSizeStyles().borderWidth} solid ${colors.primary}`,
    borderTop: `${getSizeStyles().borderWidth} solid transparent`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  }

  return (
    <>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      <div style={containerStyles}>
        <div style={spinnerStyles} />
        {showMessage && (
          <p style={{
            margin: 0,
            fontSize: typography.size.base,
            color: colors.text.secondary,
            textAlign: 'center',
          }}>
            {message}
          </p>
        )}
      </div>
    </>
  )
} 