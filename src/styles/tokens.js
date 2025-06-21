// Design System Tokens
export const colors = {
  // Primary palette
  primary: '#007AFF',
  primaryHover: '#0066CC',
  primaryLight: '#5AC8FA',
  
  // Neutrals
  text: {
    primary: '#1C1C1E',
    secondary: '#8E8E93',
    tertiary: '#C7C7CC',
  },
  
  // Background
  background: {
    primary: '#FFFFFF',
    secondary: '#F2F2F7',
    tertiary: '#F8FAFC',
  },
  
  // Borders
  border: {
    default: '#E5E5EA',
    light: '#F2F2F7',
    dark: '#C7C7CC',
  },
  
  // Status colors
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  
  // Gradients
  gradients: {
    primary: 'linear-gradient(135deg, #007AFF, #5AC8FA)',
  }
}

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  xxl: '24px',
  xxxl: '32px',
  xxxxl: '40px',
}

export const typography = {
  size: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    xxl: '24px',
    xxxl: '28px',
    xxxxl: '32px',
  },
  weight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  }
}

export const borderRadius = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  full: '50%',
}

export const shadows = {
  sm: '0 1px 3px rgba(0, 0, 0, 0.1)',
  md: '0 2px 8px rgba(0, 0, 0, 0.1)',
  lg: '0 4px 16px rgba(0, 0, 0, 0.1)',
  xl: '0 8px 32px rgba(0, 0, 0, 0.15)',
}

export const zIndex = {
  dropdown: 1000,
  modal: 2000,
  popover: 3000,
  tooltip: 4000,
  notification: 5000,
}

// Common component styles
export const commonStyles = {
  button: {
    base: {
      padding: `${spacing.lg} ${spacing.xxl}`,
      borderRadius: borderRadius.md,
      fontSize: typography.size.base,
      fontWeight: typography.weight.semibold,
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      minHeight: '48px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    primary: {
      backgroundColor: colors.primary,
      color: colors.background.primary,
    },
    secondary: {
      backgroundColor: colors.background.secondary,
      color: colors.text.primary,
    },
    danger: {
      backgroundColor: colors.error,
      color: colors.background.primary,
    }
  },
  
  input: {
    base: {
      padding: spacing.lg,
      border: `1px solid ${colors.text.tertiary}`,
      borderRadius: borderRadius.md,
      fontSize: typography.size.base,
      outline: 'none',
      transition: 'border-color 0.2s',
      backgroundColor: colors.background.primary,
    },
    focus: {
      borderColor: colors.primary,
      boxShadow: `0 0 0 3px ${colors.primary}20`,
    }
  },
  
  card: {
    base: {
      backgroundColor: colors.background.primary,
      borderRadius: borderRadius.lg,
      padding: spacing.xl,
      boxShadow: shadows.sm,
    }
  }
} 