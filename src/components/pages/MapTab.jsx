import React from 'react'
import MapView from '../MapView'

export default function MapTab({ 
  restaurants, 
  supabase, 
  session, 
  onRestaurantUpdate, 
  onRestaurantDelete 
}) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      overflow: 'hidden'
    }}>
      <MapView 
        restaurants={restaurants} 
        supabase={supabase} 
        session={session} 
        onRestaurantUpdate={onRestaurantUpdate} 
        onRestaurantDelete={onRestaurantDelete} 
      />
    </div>
  )
} 