import React, { useState } from 'react'
import Button from '../../ui/Button'
import Container from '../../ui/Layout/Container'
import { colors, spacing, typography, borderRadius } from '../../../styles/tokens'

export default function CreateListPage({ session, supabase, onClose, onListCreated }) {
  const [listName, setListName] = useState('')
  const [description, setDescription] = useState('')
  const [isCollaborative, setIsCollaborative] = useState(false)
  const [creating, setCreating] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!listName.trim()) return

    setCreating(true)
    try {
      if (!session?.user?.id) {
        throw new Error('No user session found. Please try logging in again.')
      }
      
      const { data, error } = await supabase
        .from('lists')
        .insert([
          {
            name: listName.trim(),
            description: description.trim() || null,
            is_public: isCollaborative,
            owner_id: session?.user?.id
          }
        ])
        .select()

      if (error) throw error

      console.log('List created successfully:', data[0])
      
      // Reset form
      setListName('')
      setDescription('')
      setIsCollaborative(false)
      
      // Notify parent and close
      if (onListCreated) onListCreated()
      onClose()
    } catch (error) {
      console.error('Error creating list:', error)
      alert(`Failed to create list: ${error.message}`)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: colors.background.primary,
      zIndex: 5000,
      display: 'flex',
      flexDirection: 'column',
      height: '100dvh' // Dynamic viewport height for mobile
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `${spacing.lg} ${spacing.lg}`,
        borderBottom: `1px solid ${colors.border.light}`,
        backgroundColor: colors.background.primary,
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <Button 
          variant="secondary" 
          size="small"
          onClick={onClose}
          disabled={creating}
        >
          Cancel
        </Button>
        
        <h1 style={{
          margin: 0,
          fontSize: typography.size.lg,
          fontWeight: typography.weight.semibold,
          color: colors.text.primary,
          textAlign: 'center'
        }}>
          Create List
        </h1>
        
        <Button 
          variant="primary" 
          size="small"
          onClick={handleSubmit}
          disabled={creating || !listName.trim()}
        >
          {creating ? 'Creating...' : 'Create'}
        </Button>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        paddingBottom: spacing.xl
      }}>
        <Container>
          <form onSubmit={handleSubmit} style={{ paddingTop: spacing.xl }}>
            <div style={{ marginBottom: spacing.xl }}>
              <label style={{
                display: 'block',
                marginBottom: spacing.sm,
                fontSize: typography.size.base,
                fontWeight: typography.weight.semibold,
                color: colors.text.primary
              }}>List Name</label>
              <input
                type="text"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                placeholder="e.g., Date Night Spots, Weekend Brunch..."
                maxLength={100}
                required
                style={{
                  width: '100%',
                  padding: spacing.lg,
                  border: `2px solid ${colors.border.default}`,
                  borderRadius: borderRadius.md,
                  fontSize: typography.size.lg,
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box',
                  backgroundColor: colors.background.primary
                }}
                onFocus={(e) => e.target.style.borderColor = colors.primary}
                onBlur={(e) => e.target.style.borderColor = colors.border.default}
              />
            </div>

            <div style={{ marginBottom: spacing.xl }}>
              <label style={{
                display: 'block',
                marginBottom: spacing.sm,
                fontSize: typography.size.base,
                fontWeight: typography.weight.semibold,
                color: colors.text.primary
              }}>Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this list for?"
                rows={4}
                maxLength={300}
                style={{
                  width: '100%',
                  padding: spacing.lg,
                  border: `2px solid ${colors.border.default}`,
                  borderRadius: borderRadius.md,
                  fontSize: typography.size.base,
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  backgroundColor: colors.background.primary,
                  minHeight: '120px'
                }}
                onFocus={(e) => e.target.style.borderColor = colors.primary}
                onBlur={(e) => e.target.style.borderColor = colors.border.default}
              />
            </div>

            <div style={{ 
              marginBottom: spacing.xl,
              padding: spacing.lg,
              backgroundColor: colors.background.secondary,
              borderRadius: borderRadius.md,
              border: `1px solid ${colors.border.light}`
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: spacing.md,
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={isCollaborative}
                  onChange={(e) => setIsCollaborative(e.target.checked)}
                  style={{
                    width: '20px',
                    height: '20px',
                    cursor: 'pointer',
                    marginTop: '2px',
                    flexShrink: 0
                  }}
                />
                <div>
                  <span style={{
                    fontSize: typography.size.base,
                    fontWeight: typography.weight.semibold,
                    color: colors.text.primary,
                    display: 'block',
                    marginBottom: spacing.xs
                  }}>
                    Make this a collaborative list
                  </span>
                  <span style={{
                    fontSize: typography.size.sm,
                    color: colors.text.secondary,
                    lineHeight: 1.4
                  }}>
                    {isCollaborative 
                      ? 'Friends can add places to this list' 
                      : 'Only you can add places to this list'
                    }
                  </span>
                </div>
              </label>
            </div>
          </form>
        </Container>
      </div>
    </div>
  )
} 