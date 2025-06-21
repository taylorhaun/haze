import React, { useState } from 'react'
import Container from '../../ui/Layout/Container'
import PageHeader from '../../ui/Layout/PageHeader'
import Button from '../../ui/Button'
import EmptyState from '../../ui/EmptyState'
import LoadingSpinner from '../../ui/LoadingSpinner'
import CreateListModal from './CreateListModal'
import { useLists } from '../../../hooks/useLists'
import { colors, spacing, typography, borderRadius } from '../../../styles/tokens'

export default function ListsManager({ session, supabase, standalone = false, onClose }) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  
  // Add debugging
  console.log('ListsManager props:', { session: !!session, supabase: !!supabase, userId: session?.user?.id })
  
  // Early return if missing required props
  if (!session || !supabase) {
    return (
      <Container>
        <EmptyState
          icon="⚠️"
          title="Session Error"
          description="Missing session or database connection"
          actionLabel="Refresh Page"
          onAction={() => window.location.reload()}
        />
      </Container>
    )
  }
  
  const { lists, loading, error, fetchLists } = useLists(supabase, session?.user?.id)

  const handleListCreated = () => {
    fetchLists() // Refresh the lists
  }

  if (loading) {
    return (
      <Container>
        {!standalone && (
          <PageHeader
            title="Lists"
            icon="📝"
          />
        )}
        <LoadingSpinner message="Loading your lists..." />
      </Container>
    )
  }

  if (error) {
    return (
      <Container>
        {!standalone && (
          <PageHeader
            title="Lists"
            icon="📝"
          />
        )}
        <EmptyState
          icon="⚠️"
          title="Error loading lists"
          description={error}
          actionLabel="Try Again"
          onAction={fetchLists}
        />
      </Container>
    )
  }

  return (
    <Container padding={standalone ? "default" : "minimal"}>
      {!standalone && (
        <PageHeader
          title="Lists"
          icon="📝"
          subtitle="Organize your favorite places"
        />
      )}

      {lists.length === 0 ? (
        <EmptyState
          icon="📝"
          title="No lists yet"
          description="Create lists to organize your favorite places!"
          actionLabel="Create Your First List"
          onAction={() => setShowCreateModal(true)}
        />
      ) : (
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing.xl
          }}>
            <h3 style={{
              margin: 0,
              fontSize: typography.size.lg,
              fontWeight: typography.weight.semibold,
              color: colors.text.primary
            }}>
              My Lists ({lists.length})
            </h3>
            <Button
              variant="primary"
              size="small"
              onClick={() => setShowCreateModal(true)}
            >
              Create List
            </Button>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: spacing.md
          }}>
            {lists.map(list => (
              <div
                key={list.id}
                style={{
                  background: colors.background.primary,
                  borderRadius: borderRadius.md,
                  padding: spacing.lg,
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: `1px solid ${colors.border.light}`
                }}
                onMouseEnter={(e) => {
                  e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)'
                  e.target.style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)'
                  e.target.style.transform = 'translateY(0)'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: spacing.sm
                }}>
                  <h4 style={{
                    margin: 0,
                    fontSize: typography.size.lg,
                    fontWeight: typography.weight.semibold,
                    color: colors.text.primary,
                    flex: 1
                  }}>
                    {list.name}
                  </h4>
                  <div style={{
                    fontSize: typography.size.lg,
                    marginLeft: spacing.md
                  }}>
                    {list.is_public ? '👥' : '🔒'}
                  </div>
                </div>

                {list.description && (
                  <p style={{
                    margin: `0 0 ${spacing.sm} 0`,
                    color: colors.text.secondary,
                    fontSize: typography.size.sm,
                    lineHeight: typography.lineHeight.normal
                  }}>
                    {list.description}
                  </p>
                )}

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: typography.size.sm,
                  color: colors.text.secondary
                }}>
                  <span>{list.place_count || 0} places</span>
                  <span>{list.is_public ? 'Collaborative' : 'Private'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showCreateModal && (
        <CreateListModal
          session={session}
          supabase={supabase}
          onClose={() => setShowCreateModal(false)}
          onListCreated={handleListCreated}
        />
      )}
    </Container>
  )
} 