import React, { useState, useEffect, useRef } from 'react'
import { Loader } from '@googlemaps/js-api-loader'

export default function MapView({ restaurants }) {
  const mapRef = useRef(null)
  const [map, setMap] = useState(null)
  const [googleMaps, setGoogleMaps] = useState(null)
  const [markers, setMarkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [userLocationMarker, setUserLocationMarker] = useState(null)
  const [locationLoading, setLocationLoading] = useState(false)

  // Initialize Google Maps
  useEffect(() => {
    const initGoogleMaps = async () => {
      if (import.meta.env.VITE_GOOGLE_MAPS_API_KEY === 'placeholder') {
        setError('Google Maps API key not configured')
        setLoading(false)
        return
      }

      try {
        const loader = new Loader({
          apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
          version: 'weekly',
          libraries: ['places']
        })
        
        await loader.load()
        setGoogleMaps(window.google)
      } catch (error) {
        console.error('Failed to load Google Maps:', error)
        setError('Failed to load Google Maps')
      } finally {
        setLoading(false)
      }
    }
    
    initGoogleMaps()
  }, [])

  // Create map when Google Maps is loaded
  useEffect(() => {
    if (googleMaps && mapRef.current && !map) {
      // Default to San Francisco if no restaurants
      const defaultCenter = { lat: 37.7749, lng: -122.4194 }
      
      const mapInstance = new googleMaps.maps.Map(mapRef.current, {
        zoom: 12,
        center: defaultCenter,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        // Google's location button - this might not appear until location permission is granted
        myLocationButtonControl: true,
        gestureHandling: 'greedy',
        zoomControl: true,
        zoomControlOptions: {
          position: googleMaps.maps.ControlPosition.RIGHT_CENTER
        },
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      })

      // Debug: Check if location button appears
      setTimeout(() => {
        const controls = mapInstance.controls
        let buttonFound = false
        
        // Check each control position for location button
        for (let position in googleMaps.maps.ControlPosition) {
          const controlArray = controls[googleMaps.maps.ControlPosition[position]]
          if (controlArray && controlArray.getLength() > 0) {
            buttonFound = true
          }
        }
        
        if (!buttonFound) {
          console.warn('❌ No Google location button found - might appear after location permission')
        }
      }, 1000)

      // Listen for the built-in location button clicks if it appears
      mapInstance.addListener('my_location_button_click', () => {
        console.log('🗺️ Google location button clicked!')
      })

      setMap(mapInstance)
    }
  }, [googleMaps, map])

  // Custom location function as fallback
  const getCurrentLocation = () => {
    const deviceType = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 'MOBILE' : 'DESKTOP'
    
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userPos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }
        
        setUserLocation(userPos)
        
        // Center map on user location
        if (map) {
          map.panTo(userPos)
          map.setZoom(15)
        }
      },
      (error) => {
        let errorMessage = 'Unable to get your location.'
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = `📍 Location Permission Issue

The browser blocked location access. Here's how to fix it:

🔄 **First, try this:**
1. Close Chrome completely (swipe up, find Chrome, swipe up to close)
2. Reopen Chrome and try again

📱 **If that doesn't work:**
1. In Chrome, tap the "aA" in the address bar
2. Tap "Website Settings" 
3. Tap "Location" → "Allow"

⚙️ **Or reset site permissions:**
1. iPhone Settings → Chrome → Privacy → Clear Browsing Data
2. Select "Site Settings" and clear
3. Come back and try again

The iPhone Location setting (Settings → Chrome → Location → "While Using App") should already be set.`
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = `📍 Can't Find Your Location

Try:
• Moving closer to a window
• Going outside for better GPS signal
• Making sure Location Services is on in iPhone Settings`
            break
          case error.TIMEOUT:
            errorMessage = `📍 Location Search Timed Out

Please:
• Try again in a moment
• Make sure you have good GPS signal
• Check Location Services are enabled`
            break
        }
        
        alert(errorMessage)
      },
      {
        enableHighAccuracy: true,
        timeout: 15000, // Increased timeout for mobile
        maximumAge: 300000 // 5 minutes
      }
    )
  }

  // Add/update user location marker
  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    
    if (!map || !googleMaps || !userLocation) return

    // Remove existing user location marker
    if (userLocationMarker) {
      userLocationMarker.setMap(null)
      if (userLocationMarker.pulseCircle) {
        userLocationMarker.pulseCircle.setMap(null)
      }
    }

    // Create user location marker with mobile-optimized styling
    const markerIcon = isMobile ? {
      // Mobile: Use a larger, simpler marker
      path: googleMaps.maps.SymbolPath.CIRCLE,
      fillColor: '#10b981',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 6, // Thicker border for mobile
      scale: 16 // Bigger for mobile visibility
    } : {
      // Desktop: Regular size
      path: googleMaps.maps.SymbolPath.CIRCLE,
      fillColor: '#10b981',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 4,
      scale: 12
    }

    const userMarker = new googleMaps.maps.Marker({
      position: userLocation,
      map,
      title: 'Your Location',
      icon: markerIcon,
      animation: googleMaps.maps.Animation.DROP,
      zIndex: 10000, // Much higher z-index for mobile
      optimized: false // Disable optimization for better mobile visibility
    })

    // Add pulsing circle around user location (bigger on mobile)
    const circleRadius = isMobile ? 200 : 150
    const pulseCircle = new googleMaps.maps.Circle({
      center: userLocation,
      radius: circleRadius,
      map,
      fillColor: '#10b981',
      fillOpacity: isMobile ? 0.2 : 0.15, // More visible on mobile
      strokeColor: '#10b981',
      strokeOpacity: isMobile ? 0.6 : 0.4,
      strokeWeight: isMobile ? 4 : 3,
      zIndex: 9999 // High z-index for mobile
    })

    // Create info window for user location
    const userInfoWindow = new googleMaps.maps.InfoWindow({
      content: `
        <div style="padding: 8px; text-align: center;">
          <h3 style="margin: 0 0 4px 0; color: #1e293b; font-size: 16px; font-weight: 600;">
            📍 You are here
          </h3>
          <p style="margin: 0; color: #64748b; font-size: 14px;">
            Current location${isMobile ? ' (mobile)' : ' (desktop)'}
          </p>
        </div>
      `,
      maxWidth: 200
    })

    // Add click listener
    userMarker.addListener('click', () => {
      userInfoWindow.open(map, userMarker)
    })

    // Force map refresh on mobile to ensure marker visibility
    if (isMobile) {
      setTimeout(() => {
        map.panBy(1, 1) // Tiny pan to force redraw
        map.panBy(-1, -1) // Pan back
      }, 100)
    }

    // Store reference to marker and circle
    userMarker.pulseCircle = pulseCircle
    setUserLocationMarker(userMarker)
    
  }, [map, googleMaps, userLocation])

  // Add markers when map and restaurants are ready
  useEffect(() => {
    if (!map || !googleMaps || !restaurants.length) return

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null))
    
    const newMarkers = []
    const bounds = new googleMaps.maps.LatLngBounds()
    let validLocations = 0

    // Add user location to bounds if available
    if (userLocation) {
      bounds.extend(userLocation)
    }

    restaurants.forEach((savedRec) => {
      const restaurant = savedRec.restaurants
      
      // Skip if no coordinates
      if (!restaurant?.latitude || !restaurant?.longitude) return

      const position = {
        lat: parseFloat(restaurant.latitude),
        lng: parseFloat(restaurant.longitude)
      }

      // Create custom marker icon
      const markerIcon = {
        path: googleMaps.maps.SymbolPath.CIRCLE,
        fillColor: '#3b82f6',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
        scale: 8
      }

      // Create marker
      const marker = new googleMaps.maps.Marker({
        position,
        map,
        title: restaurant.name,
        icon: markerIcon,
        animation: googleMaps.maps.Animation.DROP
      })

      // Create info window content
      const infoContent = createInfoWindowContent(restaurant, savedRec, userLocation)
      
      const infoWindow = new googleMaps.maps.InfoWindow({
        content: infoContent,
        maxWidth: 300
      })

      // Add click listener
      marker.addListener('click', () => {
        // Close other info windows
        markers.forEach(m => m.infoWindow?.close())
        
        infoWindow.open(map, marker)
        marker.infoWindow = infoWindow
      })

      marker.infoWindow = infoWindow
      newMarkers.push(marker)
      bounds.extend(position)
      validLocations++
    })

    setMarkers(newMarkers)

    // Fit map to show all markers (including user location)
    if (validLocations > 0 || userLocation) {
      if (validLocations === 1 && !userLocation) {
        map.setCenter(bounds.getCenter())
        map.setZoom(15)
      } else {
        map.fitBounds(bounds, { padding: 50 })
      }
    }

  }, [map, googleMaps, restaurants, userLocation])

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 3959 // Radius of Earth in miles
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    const distance = R * c
    return distance
  }

  // Create info window HTML content
  const createInfoWindowContent = (restaurant, savedRec, userLocation) => {
    const tags = savedRec.tags?.length ? savedRec.tags.slice(0, 3).join(', ') : ''
    const rating = restaurant.rating ? `⭐ ${restaurant.rating}` : ''
    const source = savedRec.source_type === 'instagram' ? '📷 From Instagram' : '✏️ Manual entry'
    
    // Calculate distance if user location is available
    let distanceText = ''
    if (userLocation && restaurant.latitude && restaurant.longitude) {
      const distance = calculateDistance(
        userLocation.lat, userLocation.lng,
        parseFloat(restaurant.latitude), parseFloat(restaurant.longitude)
      )
      distanceText = `📍 ${distance.toFixed(1)} miles away`
    }
    
    return `
      <div style="padding: 8px; max-width: 280px;">
        <h3 style="margin: 0 0 8px 0; color: #1e293b; font-size: 16px; font-weight: 600;">
          ${restaurant.name}
        </h3>
        
        ${restaurant.address ? `
          <p style="margin: 0 0 6px 0; color: #64748b; font-size: 14px; line-height: 1.4;">
            📍 ${restaurant.address}
          </p>
        ` : ''}
        
        ${distanceText ? `
          <p style="margin: 0 0 6px 0; color: #10b981; font-size: 14px; font-weight: 500;">
            ${distanceText}
          </p>
        ` : ''}
        
        ${rating ? `
          <p style="margin: 0 0 6px 0; color: #64748b; font-size: 14px;">
            ${rating}
          </p>
        ` : ''}
        
        ${restaurant.phone ? `
          <p style="margin: 0 0 6px 0; color: #64748b; font-size: 14px;">
            📞 <a href="tel:${restaurant.phone}" style="color: #3b82f6; text-decoration: none;">
              ${restaurant.phone}
            </a>
          </p>
        ` : ''}
        
        ${savedRec.user_notes ? `
          <p style="margin: 6px 0; color: #374151; font-size: 14px; font-style: italic; line-height: 1.4;">
            "${savedRec.user_notes}"
          </p>
        ` : ''}
        
        ${tags ? `
          <div style="margin: 8px 0 4px 0;">
            <span style="display: inline-block; background: #eff6ff; color: #3b82f6; padding: 2px 6px; border-radius: 4px; font-size: 12px; font-weight: 500;">
              ${tags}
            </span>
          </div>
        ` : ''}
        
        <p style="margin: 6px 0 0 0; color: #9ca3af; font-size: 12px;">
          ${source} • ${new Date(savedRec.created_at).toLocaleDateString()}
        </p>
        
        ${restaurant.website ? `
          <div style="margin-top: 8px;">
            <a href="${restaurant.website}" target="_blank" rel="noopener noreferrer" 
               style="color: #3b82f6; font-size: 14px; text-decoration: none; font-weight: 500;">
              Visit Website →
            </a>
          </div>
        ` : ''}
      </div>
    `
  }

  // Handle errors
  if (error) {
    return (
      <div className="map-container">
        <div className="loading">
          <div style={{ textAlign: 'center', color: '#ef4444' }}>
            <h3>Maps Unavailable</h3>
            <p>{error}</p>
            <small style={{ display: 'block', marginTop: '8px', color: '#64748b' }}>
              {restaurants.length} restaurants saved in list view
            </small>
          </div>
        </div>
      </div>
    )
  }

  // Handle loading
  if (loading) {
    return (
      <div className="map-container">
        <div className="loading">
          <div style={{ textAlign: 'center' }}>
            <h3>🗺️ Loading Map...</h3>
            <p>Preparing to show {restaurants.length} restaurants</p>
          </div>
        </div>
      </div>
    )
  }

  // Handle no restaurants
  if (restaurants.length === 0) {
    return (
      <div className="map-container">
        <div className="loading">
          <div style={{ textAlign: 'center' }}>
            <h3>🗺️ Map Ready</h3>
            <p>Add some restaurants to see them plotted here!</p>
            <small style={{ color: '#64748b', marginTop: '8px', display: 'block' }}>
              Restaurants with addresses will appear as markers
            </small>
          </div>
        </div>
      </div>
    )
  }

  // Count restaurants with valid locations
  const restaurantsWithLocation = restaurants.filter(r => 
    r.restaurants?.latitude && r.restaurants?.longitude
  ).length

  return (
    <div className="map-container" style={{ position: 'relative' }}>
      {/* Map */}
      <div 
        ref={mapRef} 
        style={{ 
          width: '100%', 
          height: '100%',
          minHeight: '80vh',
          borderRadius: '0' // Mobile friendly
        }} 
      />
      
      {/* Map Stats Overlay */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '8px 12px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        fontSize: '14px',
        color: '#374151',
        backdropFilter: 'blur(4px)'
      }}>
        📍 {restaurantsWithLocation} of {restaurants.length} restaurants mapped
        {userLocation && (
          <div style={{ fontSize: '12px', color: '#10b981', marginTop: '2px' }}>
            🟢 Your location detected
          </div>
        )}
      </div>

      {/* Custom Locate Me Button as fallback */}
      <button
        onClick={getCurrentLocation}
        style={{
          position: 'absolute',
          top: '60px', // Below Google's control if it exists
          right: '10px',
          background: userLocation ? '#10b981' : '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          padding: '12px',
          cursor: 'pointer',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '48px',
          minHeight: '48px',
          transition: 'all 0.2s',
          backdropFilter: 'blur(4px)',
          fontSize: '18px'
        }}
        title={userLocation ? 'Center on your location' : 'Find my location'}
      >
        '📍'
      </button>

      {/* Missing Location Warning */}
      {restaurantsWithLocation < restaurants.length && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          right: '10px',
          background: 'rgba(251, 191, 36, 0.95)',
          color: '#92400e',
          padding: '8px 12px',
          borderRadius: '8px',
          fontSize: '13px',
          textAlign: 'center',
          backdropFilter: 'blur(4px)'
        }}>
          💡 {restaurants.length - restaurantsWithLocation} restaurants missing location data
        </div>
      )}
    </div>
  )
} 