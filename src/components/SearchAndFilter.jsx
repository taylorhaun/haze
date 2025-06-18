import React, { useState, useEffect } from 'react'

export default function SearchAndFilter({ 
  restaurants, 
  onFilteredResults, 
  allTags = [] 
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState([])
  const [selectedSource, setSelectedSource] = useState('all') // 'all', 'instagram', 'manual'
  const [sortBy, setSortBy] = useState('newest') // 'newest', 'oldest', 'name', 'rating'
  const [showFilters, setShowFilters] = useState(false)

  // Apply filters whenever any filter changes
  useEffect(() => {
    let filtered = [...restaurants]

    // Search by restaurant name, personal notes, and tags
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(savedRec => 
        // Search in restaurant name
        savedRec.restaurants?.name?.toLowerCase().includes(query) ||
        // Search in personal notes
        savedRec.user_notes?.toLowerCase().includes(query) ||
        // Search in tags
        (savedRec.tags && savedRec.tags.some(tag => tag.toLowerCase().includes(query)))
      )
    }

    // Filter by source type
    if (selectedSource !== 'all') {
      filtered = filtered.filter(savedRec => 
        savedRec.source_type === selectedSource
      )
    }

    // Filter by tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(savedRec => 
        savedRec.tags && selectedTags.some(tag => 
          savedRec.tags.includes(tag)
        )
      )
    }

    // Sort results
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at) - new Date(a.created_at)
        case 'oldest':
          return new Date(a.created_at) - new Date(b.created_at)
        case 'name':
          const nameA = a.restaurants?.name?.toLowerCase() || ''
          const nameB = b.restaurants?.name?.toLowerCase() || ''
          return nameA.localeCompare(nameB)
        case 'rating':
          const ratingA = a.restaurants?.rating || 0
          const ratingB = b.restaurants?.rating || 0
          return ratingB - ratingA
        default:
          return 0
      }
    })

    onFilteredResults(filtered)
  }, [searchQuery, selectedTags, selectedSource, sortBy, restaurants])

  const handleTagToggle = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const clearAllFilters = () => {
    setSearchQuery('')
    setSelectedTags([])
    setSelectedSource('all')
    setSortBy('newest')
  }

  const hasActiveFilters = searchQuery || selectedTags.length > 0 || selectedSource !== 'all' || sortBy !== 'newest'

  return (
    <div className="search-and-filter">
      {/* Search Bar */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="🔍 Search places..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <button 
          className="filter-toggle"
          onClick={() => setShowFilters(!showFilters)}
        >
          🎛️
          {hasActiveFilters && <span className="active-indicator">•</span>}
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="filter-panel">
          {/* Sort Options */}
          <div className="filter-group">
            <label>📊 Sort by:</label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Name (A-Z)</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>

          {/* Source Filter */}
          <div className="filter-group">
            <label>📱 Source:</label>
            <div className="source-filters">
              <button 
                className={`source-button ${selectedSource === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedSource('all')}
              >
                All
              </button>
              <button 
                className={`source-button ${selectedSource === 'instagram' ? 'active' : ''}`}
                onClick={() => setSelectedSource('instagram')}
              >
                📷 Instagram
              </button>
              <button 
                className={`source-button ${selectedSource === 'manual' ? 'active' : ''}`}
                onClick={() => setSelectedSource('manual')}
              >
                ✏️ Manual
              </button>
            </div>
          </div>

          {/* Tag Filter */}
          {allTags.length > 0 && (
            <div className="filter-group">
              <label>🏷️ Tags:</label>
              <div className="tag-filters">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    className={`tag-filter ${selectedTags.includes(tag) ? 'active' : ''}`}
                    onClick={() => handleTagToggle(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Clear Filters */}
          {hasActiveFilters && (
            <div className="filter-group">
              <button className="clear-filters" onClick={clearAllFilters}>
                ❌ Clear All Filters
              </button>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .search-and-filter {
          margin-bottom: 16px;
        }

        .search-bar {
          display: flex;
          gap: 8px;
          margin-bottom: 8px;
        }

        .search-input {
          flex: 1;
          padding: 10px 14px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 16px;
          outline: none;
          transition: border-color 0.2s;
        }

        .search-input:focus {
          border-color: #3b82f6;
        }

        .filter-toggle {
          padding: 10px;
          background: #f1f5f9;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
          white-space: nowrap;
          flex-shrink: 0;
          font-size: 16px;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .filter-toggle:hover {
          background: #e2e8f0;
        }

        .active-indicator {
          position: absolute;
          top: 4px;
          right: 4px;
          color: #ef4444;
          font-size: 16px;
          line-height: 1;
        }

        .filter-panel {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .filter-group label {
          font-weight: 600;
          color: #374151;
          font-size: 0.9rem;
        }

        .sort-select {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          background: white;
          cursor: pointer;
        }

        .source-filters {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .source-button {
          padding: 8px 16px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
          font-weight: 500;
        }

        .source-button:hover {
          background: #f3f4f6;
        }

        .source-button.active {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .tag-filters {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .tag-filter {
          padding: 6px 12px;
          border: 1px solid #d1d5db;
          border-radius: 20px;
          background: white;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
        }

        .tag-filter:hover {
          background: #f3f4f6;
        }

        .tag-filter.active {
          background: #10b981;
          color: white;
          border-color: #10b981;
        }

        .clear-filters {
          padding: 8px 16px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          align-self: flex-start;
          transition: background 0.2s;
        }

        .clear-filters:hover {
          background: #dc2626;
        }

        /* Mobile optimizations */
        @media (max-width: 640px) {
          .search-bar {
            gap: 6px;
          }

          .search-input {
            padding: 10px 12px;
            font-size: 16px; /* Prevent zoom on iOS */
          }

          .filter-toggle {
            padding: 10px 8px;
            font-size: 13px;
          }

          .active-indicator {
            top: 3px;
            right: 3px;
            font-size: 14px;
          }

          .filter-panel {
            padding: 12px;
          }

          .source-filters,
          .tag-filters {
            justify-content: center;
          }

          .sort-select {
            font-size: 16px; /* Prevent zoom on iOS */
          }
        }
      `}</style>
    </div>
  )
} 