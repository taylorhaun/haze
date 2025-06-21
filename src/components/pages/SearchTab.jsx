import React from 'react'
import Container from '../ui/Layout/Container'
import PageHeader from '../ui/Layout/PageHeader'
import EmptyState from '../ui/EmptyState'
import LoadingSpinner from '../ui/LoadingSpinner'
import SearchAndFilter from '../features/restaurants/SearchAndFilter'
import RestaurantList from '../features/restaurants/RestaurantList'
import { useRestaurants } from '../../hooks/useSupabase'

export default function SearchTab({ 
  session, 
  supabase,
  filteredRestaurants,
  onFilteredResults,
  onRestaurantDelete
}) {
  const { data: restaurants, loading, error } = useRestaurants(supabase, session.user.id)

  // Extract unique tags from restaurants
  const allTags = React.useMemo(() => {
    if (!restaurants) return []
    const tagSet = new Set()
    restaurants.forEach(savedRec => {
      if (savedRec.tags) {
        savedRec.tags.forEach(tag => tagSet.add(tag))
      }
    })
    return Array.from(tagSet).sort()
  }, [restaurants])

  if (loading) {
    return (
      <Container>
        <LoadingSpinner message="Loading your places..." />
      </Container>
    )
  }

  if (error) {
    return (
      <Container>
        <PageHeader
          title="Search"
          icon="🔍"
          subtitle="Something went wrong loading your places"
        />
        <EmptyState
          icon="⚠️"
          title="Error loading places"
          description={error}
          actionLabel="Try Again"
          onAction={() => window.location.reload()}
        />
      </Container>
    )
  }

  return (
    <Container>
      <PageHeader
        title="Search"
        icon="🔍"
        subtitle="Search and filter your saved places"
      >
        {/* Search and Filter Controls */}
        {restaurants.length > 0 && (
          <SearchAndFilter
            restaurants={restaurants}
            onFilteredResults={onFilteredResults}
            allTags={allTags}
          />
        )}
      </PageHeader>

      {/* Results */}
      {restaurants.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="Nothing to search yet"
          description="Add some places first, then come back here to search and filter them."
        />
      ) : (
        <RestaurantList 
          restaurants={filteredRestaurants}
          onRestaurantDelete={onRestaurantDelete}
          supabase={supabase}
          session={session}
        />
      )}
    </Container>
  )
} 