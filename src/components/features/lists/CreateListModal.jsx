import React, { useState } from 'react'
import Button from '../../ui/Button'
import { colors, spacing, typography, borderRadius } from '../../../styles/tokens'

export default function CreateListModal({ session, supabase, onClose, onListCreated }) {
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
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 5000,
      padding: spacing.xl
    }} onClick={onClose}>
      <div style={{
        background: colors.background.primary,
        borderRadius: borderRadius.lg,
        padding: spacing.xl,
        maxWidth: '400px',
        width: '100%',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.xl
        }}>
          <h3 style={{
            margin: 0,
            fontSize: typography.size.xl,
            fontWeight: typography.weight.bold,
            color: colors.text.primary
          }}>Create New List</h3>
          <Button 
            variant="secondary" 
            size="small"
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: spacing.lg }}>
            <label style={{
              display: 'block',
              marginBottom: spacing.sm,
              fontSize: typography.size.base,
              fontWeight: typography.weight.semibold,
              color: colors.text.primary
            }}>List Name *</label>
            <input
              type="text"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="e.g., Date Night Spots, Weekend Brunch..."
              maxLength={100}
              required
              style={{
                width: '100%',
                padding: spacing.md,
                border: `2px solid ${colors.border.default}`,
                borderRadius: borderRadius.md,
                fontSize: typography.size.base,
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = colors.primary}
              onBlur={(e) => e.target.style.borderColor = colors.border.default}
            />
          </div>

          <div style={{ marginBottom: spacing.lg }}>
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
              rows={3}
              maxLength={300}
              style={{
                width: '100%',
                padding: spacing.md,
                border: `2px solid ${colors.border.default}`,
                borderRadius: borderRadius.md,
                fontSize: typography.size.base,
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
              onFocus={(e) => e.target.style.borderColor = colors.primary}
              onBlur={(e) => e.target.style.borderColor = colors.border.default}
            />
          </div>

          <div style={{ marginBottom: spacing.xl }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={isCollaborative}
                onChange={(e) => setIsCollaborative(e.target.checked)}
                style={{
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer'
                }}
              />
              <span style={{
                fontSize: typography.size.base,
                color: colors.text.primary
              }}>
                Make collaborative (friends can add places)
              </span>
            </label>
          </div>

          <div style={{
            display: 'flex',
            gap: spacing.md,
            justifyContent: 'flex-end'
          }}>
            <Button 
              type="button" 
              variant="secondary" 
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              disabled={creating || !listName.trim()}
            >
              {creating ? 'Creating...' : 'Create List'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
} 