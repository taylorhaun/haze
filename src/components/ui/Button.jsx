import React from 'react'
import { colors, commonStyles } from '../../styles/tokens'

export default function Button({ 
  children, 
  variant = 'primary', 
  size = 'medium',
  disabled = false,
  loading = false,
  onClick,
  ...props 
}) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return commonStyles.button.primary
      case 'secondary':
        return commonStyles.button.secondary
      case 'danger':
        return commonStyles.button.danger
      default:
        return commonStyles.button.primary
    }
  }

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { padding: '8px 16px', fontSize: '14px', minHeight: '36px' }
      case 'large':
        return { padding: '20px 32px', fontSize: '18px', minHeight: '56px' }
      default:
        return {}
    }
  }

  const styles = {
    ...commonStyles.button.base,
    ...getVariantStyles(),
    ...getSizeStyles(),
    opacity: disabled || loading ? 0.6 : 1,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
  }

  return (
    <button
      style={styles}
      onClick={disabled || loading ? undefined : onClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? '...' : children}
    </button>
  )
} 