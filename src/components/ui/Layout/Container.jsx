import React from 'react'
import { spacing } from '../../../styles/tokens'

export default function Container({ 
  children, 
  padding = 'default',
  maxWidth = '500px',
  bottomPadding = true,
  ...props 
}) {
  const getPaddingStyles = () => {
    switch (padding) {
      case 'none':
        return { padding: 0 }
      case 'minimal':
        return { 
          padding: `${spacing.lg} ${spacing.sm}`, // 16px top/bottom, 8px left/right
          paddingLeft: `max(${spacing.sm}, env(safe-area-inset-left))`,
          paddingRight: `max(${spacing.sm}, env(safe-area-inset-right))`,
        }
      case 'small':
        return { 
          padding: `${spacing.lg} ${spacing.md}`, // 16px top/bottom, 12px left/right
          paddingLeft: `max(${spacing.md}, env(safe-area-inset-left))`,
          paddingRight: `max(${spacing.md}, env(safe-area-inset-right))`,
        }
      case 'large':
        return { 
          padding: `${spacing.xxl} ${spacing.lg}`, // 24px top/bottom, 16px left/right
          paddingLeft: `max(${spacing.lg}, env(safe-area-inset-left))`,
          paddingRight: `max(${spacing.lg}, env(safe-area-inset-right))`,
        }
      default:
        return { 
          padding: `${spacing.xl} ${spacing.lg}`, // 20px top/bottom, 16px left/right  
          paddingLeft: `max(${spacing.lg}, env(safe-area-inset-left))`,
          paddingRight: `max(${spacing.lg}, env(safe-area-inset-right))`,
        }
    }
  }

  const styles = {
    maxWidth,
    margin: '0 auto',
    ...getPaddingStyles(),
    paddingBottom: bottomPadding ? '100px' : undefined, // Space for bottom nav
  }

  return (
    <div style={styles} {...props}>
      {children}
    </div>
  )
} 