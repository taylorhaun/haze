import React from 'react'
import { typography, colors, spacing } from '../../../styles/tokens'

export default function PageHeader({ 
  title, 
  subtitle, 
  icon, 
  action,
  children 
}) {
  return (
    <header style={{ marginBottom: spacing.xl }}>
      {/* Title section */}
      <div style={{ marginBottom: subtitle ? spacing.lg : 0 }}>
        <h1 style={{
          margin: 0,
          fontSize: typography.size.xxxl,
          fontWeight: typography.weight.bold,
          color: colors.text.primary,
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
        }}>
          {icon && <span>{icon}</span>}
          {title}
        </h1>
      </div>

      {/* Subtitle */}
      {subtitle && (
        <p style={{
          margin: 0,
          fontSize: typography.size.base,
          color: colors.text.secondary,
          lineHeight: typography.lineHeight.normal,
          marginBottom: spacing.lg,
        }}>
          {subtitle}
        </p>
      )}

      {/* Action button */}
      {action && (
        <div style={{ marginBottom: spacing.lg }}>
          {action}
        </div>
      )}

      {/* Additional content */}
      {children}
    </header>
  )
} 