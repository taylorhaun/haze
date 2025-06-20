import React from 'react'
import SearchAndFilter from './SearchAndFilter'
import RestaurantList from './RestaurantList'

export default function SearchTab({ 
  restaurants, 
  filteredRestaurants,
  onFilteredResults, 
  allTags, 
  onRestaurantDelete,
  supabase,
  session
}) {
  return (
    <div style={{
      paddingBottom: '100px', // Space for bottom nav
      minHeight: '100vh'
    }}>
      {/* Search Header */}
      <div style={{
        padding: '20px 20px 0 20px',
        maxWidth: '500px',
        margin: '0 auto'
      }}>
        <h2 style={{
          margin: '0 0 16px 0',
          fontSize: '28px',
          fontWeight: '700',
          color: '#1C1C1E'
        }}>
          🔍 Search
        </h2>
        <p style={{
          margin: '0 0 20px 0',
          fontSize: '16px',
          color: '#8E8E93',
          lineHeight: 1.4
        }}>
          Search and filter your saved places
        </p>
      </div>

      {/* Search and Filter Controls */}
      {restaurants.length > 0 && (
        <div style={{
          padding: '0 20px',
          maxWidth: '500px',
          margin: '0 auto'
        }}>
          <SearchAndFilter
            restaurants={restaurants}
            onFilteredResults={onFilteredResults}
            allTags={allTags}
          />
        </div>
      )}

      {/* Results */}
      <div style={{
        marginTop: '20px'
      }}>
        {restaurants.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#8E8E93'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
            <h3 style={{
              margin: '0 0 8px 0',
              fontSize: '20px',
              fontWeight: '600',
              color: '#1C1C1E'
            }}>
              Nothing to search yet
            </h3>
            <p style={{
              margin: 0,
              fontSize: '16px',
              lineHeight: 1.4
            }}>
              Add some places first, then come back here to search and filter them.
            </p>
          </div>
        ) : (
          <RestaurantList 
            restaurants={filteredRestaurants}
            onRestaurantDelete={onRestaurantDelete}
            supabase={supabase}
            session={session}
          />
        )}
      </div>
    </div>
  )
} 