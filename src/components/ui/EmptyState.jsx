import React from 'react'
import { colors, spacing, typography } from '../../styles/tokens'
import Button from './Button'

export default function EmptyState({ 
  icon = '📭',
  title,
  description,
  action,
  actionLabel,
  onAction,
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: `${spacing.xxxxl} ${spacing.xl}`,
      minHeight: '300px',
    }}>
      {/* Icon */}
      <div style={{
        fontSize: '48px',
        marginBottom: spacing.lg,
      }}>
        {icon}
      </div>

      {/* Title */}
      <h3 style={{
        margin: `0 0 ${spacing.sm} 0`,
        fontSize: typography.size.xl,
        fontWeight: typography.weight.semibold,
        color: colors.text.primary,
      }}>
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p style={{
          margin: `0 0 ${spacing.xxl} 0`,
          fontSize: typography.size.base,
          color: colors.text.secondary,
          lineHeight: typography.lineHeight.normal,
          maxWidth: '280px',
        }}>
          {description}
        </p>
      )}

      {/* Action button */}
      {(action || (actionLabel && onAction)) && (
        <div>
          {action || (
            <Button onClick={onAction} variant="primary">
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  )
} 