import React from 'react'

export default function MapView({ restaurants }) {
  return (
    <div className="map-container">
      <div className="loading">
        Map view coming soon! 
        <br />
        <small>Will display {restaurants.length} restaurants on Google Maps</small>
      </div>
    </div>
  )
} 