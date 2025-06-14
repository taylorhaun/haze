import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Loader } from '@googlemaps/js-api-loader'
import RestaurantDetail from './RestaurantDetail'
import './MapView.css'  // We'll create this file next
import BottomSheet from './BottomSheet'

export default function MapView({ restaurants, supabase, session, onRestaurantUpdate }) {
  const mapRef = useRef(null)
  const [map, setMap] = useState(null)
  const [googleMaps, setGoogleMaps] = useState(null)
  const [markers, setMarkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [userLocationMarker, setUserLocationMarker] = useState(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const justCenteredOnUser = useRef(false)
  const [selectedSavedRec, setSelectedSavedRec] = useState(null)
  const [selectedRestaurant, setSelectedRestaurant] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartY, setDragStartY] = useState(0)
  const [dragStartHeight, setDragStartHeight] = useState(0)
  const [height, setHeight] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  // Use the parent's filteredRestaurants prop directly
  const filteredRestaurants = restaurants

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
          map.setZoom(14) // Slightly wider view
          justCenteredOnUser.current = true
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
      // Mobile: Use a blue, smaller marker
      path: googleMaps.maps.SymbolPath.CIRCLE,
      fillColor: '#2563eb', // blue
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 6,
      scale: 11 // 16 * 0.7 = 11.2
    } : {
      // Desktop: Blue, smaller marker
      path: googleMaps.maps.SymbolPath.CIRCLE,
      fillColor: '#2563eb', // blue
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 4,
      scale: 8 // 12 * 0.7 = 8.4
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
      fillColor: '#2563eb', // blue
      fillOpacity: isMobile ? 0.2 : 0.15, // More visible on mobile
      strokeColor: '#2563eb', // blue
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

  // Filter restaurants based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    const query = searchQuery.toLowerCase().trim()
    const filtered = restaurants.filter(rec => {
      const name = rec.restaurants?.name?.toLowerCase() || ''
      const tags = rec.tags || []
      const tagMatch = tags.some(tag => tag.toLowerCase().includes(query))
      const nameMatch = name.includes(query)
      return nameMatch || tagMatch
    })

    setFilteredRestaurants(filtered)
  }, [searchQuery, restaurants])

  // Update markers when filtered restaurants change
  useEffect(() => {
    if (!map || !googleMaps) return
    markers.forEach(marker => marker.setMap(null))
    setMarkers([])
    const newMarkers = filteredRestaurants
      .filter(rec => rec.restaurants?.latitude && rec.restaurants?.longitude)
      .map(rec => {
        const marker = new googleMaps.maps.Marker({
          position: {
            lat: rec.restaurants.latitude,
            lng: rec.restaurants.longitude
          },
          map,
          title: rec.restaurants.name,
          icon: {
            path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
            fillColor: '#EA4335',
            fillOpacity: 1,
            strokeColor: '#B31412',
            strokeWeight: 2,
            scale: 2,
            anchor: new googleMaps.maps.Point(12, 24)
          },
          animation: googleMaps.maps.Animation.DROP
        })
        marker.addListener('click', () => {
          setSelectedSavedRec(rec)
          setSelectedRestaurant(rec.restaurants)
          setHeight(window.innerHeight * 0.5)
        })
        return marker
      })
    setMarkers(newMarkers)
    // Optionally fit bounds here if needed
  }, [filteredRestaurants, map, googleMaps])

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
        path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
        fillColor: '#EA4335', // Google Maps red
        fillOpacity: 1,
        strokeColor: '#B31412',
        strokeWeight: 2,
        scale: 2,
        anchor: new googleMaps.maps.Point(12, 24)
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
        setSelectedSavedRec(savedRec);
        setSelectedRestaurant(restaurant);
        setHeight(window.innerHeight * 0.5); // Explicitly set to half height
      })

      marker.infoWindow = infoWindow
      newMarkers.push(marker)
      bounds.extend(position)
      validLocations++
    })

    setMarkers(newMarkers)

    // Only fit bounds if not just centered on user
    if (justCenteredOnUser.current) {
      justCenteredOnUser.current = false
      return
    }

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

  // Generate Google Maps search URL for the restaurant
  const getDirectionsUrl = (restaurant) => {
    // Search for the restaurant by name and address in Google Maps
    // This opens the actual business listing instead of just coordinates
    let searchQuery = restaurant.name
    
    if (restaurant.address) {
      searchQuery += ` ${restaurant.address}`
    }
    
    if (searchQuery) {
      return `https://maps.google.com/maps?q=${encodeURIComponent(searchQuery)}`
    }
    
    return null
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

    // Get directions URL
    const directionsUrl = getDirectionsUrl(restaurant)
    
    return `
      <div style="padding: 10px; max-width: 310px;">
        <h3 style="margin: 0 0 8px 0; color: #1e293b; font-size: 17px; font-weight: 600;">
          ${restaurant.name}
        </h3>
        
        ${rating ? `
          <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px;">
            ${rating}
          </p>
        ` : ''}
        
        ${tags ? `
          <div style="margin: 0 0 8px 0;">
            <span style="display: inline-block; background: #eff6ff; color: #3b82f6; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">
              ${tags}
            </span>
          </div>
        ` : ''}
        
        ${distanceText ? `
          <p style="margin: 0 0 8px 0; color: #10b981; font-size: 14px; font-weight: 500;">
            ${distanceText}
          </p>
        ` : ''}
        
        ${savedRec.user_notes ? `
          <p style="margin: 8px 0; color: #374151; font-size: 14px; font-style: italic; line-height: 1.4;">
            "${savedRec.user_notes}"
          </p>
        ` : ''}

        ${restaurant.address ? `
          <p style="margin: 8px 0; color: #64748b; font-size: 13px; line-height: 1.4;">
            📍 ${restaurant.address}
          </p>
        ` : ''}

        <!-- Action buttons -->
        <div style="display: flex; gap: 8px; margin: 12px 0;">
          ${directionsUrl ? `
            <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer"
               style="
                 background: #3b82f6; 
                 color: white; 
                 text-decoration: none; 
                 padding: 8px 12px; 
                 border-radius: 6px; 
                 font-size: 13px; 
                 font-weight: 500;
                 display: flex;
                 align-items: center;
                 gap: 4px;
                 transition: background 0.2s;
               "
               onmouseover="this.style.background='#2563eb'"
               onmouseout="this.style.background='#3b82f6'">
              🧭 Get Directions
            </a>
          ` : ''}
          
          ${restaurant.website ? `
            <a href="${restaurant.website}" target="_blank" rel="noopener noreferrer" 
               style="
                 background: #e5e7eb; 
                 color: #374151; 
                 text-decoration: none; 
                 padding: 8px 12px; 
                 border-radius: 6px; 
                 font-size: 13px; 
                 font-weight: 500;
                 display: flex;
                 align-items: center;
                 gap: 4px;
                 transition: background 0.2s;
               "
               onmouseover="this.style.background='#d1d5db'"
               onmouseout="this.style.background='#e5e7eb'">
              🌐 Website
            </a>
          ` : ''}
        </div>
      </div>
    `
  }

  // Drag handlers
  const handleDragStart = (e) => {
    setIsDragging(true)
    setDragStartY(e.touches ? e.touches[0].clientY : e.clientY)
    setDragStartHeight(height)
  }
  const handleDragMove = useCallback((e) => {
    if (!isDragging) return;
    const clientY = e.type === 'mousemove' ? e.clientY : e.touches[0].clientY;
    const deltaY = dragStartY - clientY;
    const newHeight = Math.max(200, Math.min(window.innerHeight * 0.9, dragStartHeight + deltaY));
    setHeight(newHeight);
  }, [isDragging, dragStartY, dragStartHeight]);
  const handleDragEnd = useCallback((e) => {
    setIsDragging(false);
    document.removeEventListener('mousemove', handleDragMove);
    const threshold = window.innerHeight * 0.2;
    if (height > window.innerHeight * 0.7) {
      setHeight(window.innerHeight * 0.9);
    } else if (height < window.innerHeight * 0.4) {
      setHeight(200);
    } else {
      setHeight(window.innerHeight * 0.5);
    }
  }, [height, handleDragMove]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (height > window.innerHeight * 0.7) {
        setHeight(window.innerHeight * 0.9);
      } else if (height < window.innerHeight * 0.4) {
        setHeight(200);
      } else {
        setHeight(window.innerHeight * 0.5);
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [height])

  // Set height when restaurant is selected
  useEffect(() => {
    if (selectedRestaurant) {
      const halfHeight = window.innerHeight * 0.5;
      setHeight(halfHeight);
    } else {
      setHeight(0);
    }
  }, [selectedRestaurant]);

  // Add this handler in MapView
  const handleDelete = async (savedRecId) => {
    try {
      console.log('Attempting to delete:', savedRecId, 'for user:', session?.user?.id)
      const { error } = await supabase
        .from('saved_recs')
        .delete()
        .eq('id', savedRecId)
        .eq('user_id', session.user.id)
      if (error) throw error
      setSelectedSavedRec(null)
      setSelectedRestaurant(null)
      // Update markers to reflect current filteredRestaurants
      markers.forEach(marker => marker.setMap(null))
      setMarkers([])
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete restaurant: ' + (error.message || error))
    }
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
      {/* Search Bar */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        right: '10px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '24px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
          padding: '8px 16px',
          width: '100%',
          maxWidth: '500px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.2s ease',
          border: isSearching ? '2px solid #3b82f6' : '2px solid transparent'
        }}>
          <span style={{ color: '#64748b' }}>🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or tag..."
            style={{
              border: 'none',
              outline: 'none',
              width: '100%',
              fontSize: '16px',
              color: '#1e293b',
              background: 'transparent'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Search Results Count */}
        {isSearching && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '8px 16px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            fontSize: '14px',
            color: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.2s ease'
          }}>
            <span>📍</span>
            <span>
              {filteredRestaurants.length} {filteredRestaurants.length === 1 ? 'result' : 'results'} found
            </span>
          </div>
        )}
      </div>

      {/* Map */}
      <div 
        ref={mapRef} 
        style={{ 
          width: '100%',
          height: '100vh',
          borderRadius: '0',
          position: 'relative',
          zIndex: 1
        }} 
      />

      {/* Map Stats Overlay */}
      {/* <div style={{
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
      </div> */}

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
          fontSize: '18px',
          zIndex: 3000
        }}
        title={userLocation ? 'Center on your location' : 'Find my location'}
      >
        📍
      </button>

      {selectedSavedRec && selectedRestaurant && (
        <BottomSheet
          open={!!selectedSavedRec}
          onClose={() => { setSelectedSavedRec(null); setSelectedRestaurant(null); }}
          defaultHeight="half"
        >
          <RestaurantDetail
            restaurant={selectedRestaurant}
            savedRec={selectedSavedRec}
            onClose={() => { setSelectedSavedRec(null); setSelectedRestaurant(null); }}
            onDelete={handleDelete}
            supabase={supabase}
            isModal={false}
            onEdit={(updatedRec) => {
              setSelectedSavedRec(updatedRec);
              setSelectedRestaurant(updatedRec.restaurants);
              onRestaurantUpdate(updatedRec);
            }}
          />
        </BottomSheet>
      )}
    </div>
  )
}