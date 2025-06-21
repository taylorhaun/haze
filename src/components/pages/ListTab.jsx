import React from 'react'
import Container from '../ui/Layout/Container'
import PageHeader from '../ui/Layout/PageHeader'
import EmptyState from '../ui/EmptyState'
import SearchAndFilter from '../SearchAndFilter'
import RestaurantList from '../RestaurantList'

export default function ListTab({ 
  restaurants, 
  filteredRestaurants,
  onFilteredResults,
  onRestaurantDelete,
  onRestaurantUpdate,
  supabase,
  session,
  allTags
}) {
  const restaurantCount = restaurants.length
  const subtitle = restaurantCount > 0 
    ? `${restaurantCount} saved place${restaurantCount !== 1 ? 's' : ''}`
    : 'Your saved places will appear here'

  if (restaurantCount === 0) {
    return (
      <Container padding="minimal">
        <PageHeader
          title="My Places"
          icon="📋"
          subtitle={subtitle}
        />
        
        <EmptyState
          icon="📋"
          title="No restaurants yet"
          description="Tap the ➕ button to add your first restaurant from Instagram!"
        />
      </Container>
    )
  }

  return (
    <div style={{ paddingBottom: '100px' }}>
      {/* Header with minimal padding */}
      <div style={{ 
        padding: '16px 8px 0 8px',
        maxWidth: '500px', 
        margin: '0 auto',
        paddingLeft: 'max(8px, env(safe-area-inset-left))',
        paddingRight: 'max(8px, env(safe-area-inset-right))'
      }}>
        <PageHeader
          title="My Places"
          icon="📋"
          subtitle={subtitle}
        >
          {/* Search and Filter */}
          <SearchAndFilter
            restaurants={restaurants}
            onFilteredResults={onFilteredResults}
            allTags={allTags}
          />
        </PageHeader>
      </div>

      {/* Restaurant List with no extra padding */}
      <RestaurantList 
        restaurants={filteredRestaurants}
        onRestaurantDelete={onRestaurantDelete}
        onRestaurantUpdate={onRestaurantUpdate}
        supabase={supabase}
        session={session}
      />
    </div>
  )
} 