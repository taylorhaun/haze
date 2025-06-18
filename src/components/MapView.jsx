import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Loader } from '@googlemaps/js-api-loader'
import RestaurantDetail from './RestaurantDetail'
import './MapView.css'  // We'll create this file next
import UnifiedBottomSheet from './UnifiedBottomSheet'

export default function MapView({ restaurants, supabase, session, onRestaurantUpdate, onRestaurantDelete }) {
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
  const [showSearchSheet, setShowSearchSheet] = useState(false)
  const [searchSheetHeight, setSearchSheetHeight] = useState('50vh')



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
        rotateControl: false, // Disable rotate control
        scaleControl: false, // Disable scale control
        // Google's location button - this might not appear until location permission is granted
        myLocationButtonControl: false, // Disable Google's location button too
        gestureHandling: 'greedy',
        zoomControl: false, // Disable zoom controls too
        disableDefaultUI: true, // Disable ALL default UI controls
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

  // Update markers when filtered restaurants change


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

    // Filter restaurants based on search query for map display
    const restaurantsToShow = searchQuery.trim() 
      ? restaurants.filter(savedRec => {
          const query = searchQuery.toLowerCase()
          return (
            // Search in restaurant name
            savedRec.restaurants?.name?.toLowerCase().includes(query) ||
            // Search in personal notes
            savedRec.user_notes?.toLowerCase().includes(query) ||
            // Search in tags
            (savedRec.tags && savedRec.tags.some(tag => tag.toLowerCase().includes(query)))
          )
        })
      : restaurants

    restaurantsToShow.forEach((savedRec) => {
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

  }, [map, googleMaps, restaurants, userLocation, searchQuery])

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
      // Close the bottom sheet first
      setSelectedSavedRec(null)
      setSelectedRestaurant(null)
      
      // Use the parent's delete handler which handles both DB deletion and state updates
      if (onRestaurantDelete) {
        await onRestaurantDelete(savedRecId)
      } else {
        // Fallback: direct deletion if no parent handler
        const { error } = await supabase
          .from('saved_recs')
          .delete()
          .eq('id', savedRecId)
          .eq('user_id', session.user.id)
        if (error) throw error
      }
      
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete restaurant: ' + (error.message || error))
    }
  }

  const handleSearchRestaurantSelect = (savedRec) => {
    // Center map on selected restaurant
    if (map && savedRec.restaurants?.latitude && savedRec.restaurants?.longitude) {
      const position = {
        lat: parseFloat(savedRec.restaurants.latitude),
        lng: parseFloat(savedRec.restaurants.longitude)
      }
      map.panTo(position)
      map.setZoom(16)
    }
    
    // Close search sheet and show restaurant details
    setShowSearchSheet(false)
    setSelectedSavedRec(savedRec)
    setSelectedRestaurant(savedRec.restaurants)
    setHeight(window.innerHeight * 0.5)
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
              {restaurants.length} places saved in list view
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
            <p>Preparing to show {restaurants.length} places</p>
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
            <p>Add some places to see them plotted here!</p>
            <small style={{ color: '#64748b', marginTop: '8px', display: 'block' }}>
              Places with addresses will appear as markers
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
    <>
      {/* iOS-Style Search Bar - Fixed to viewport, not map */}
      <div style={{
        position: 'fixed',
        top: '10px',
        left: '10px',
        right: '10px',
        zIndex: 1500, // Higher than map but lower than bottom sheet
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none' // Allow clicks to pass through container
      }}>
        <div style={{
          background: 'white',
          borderRadius: '28px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          padding: '12px 20px',
          width: '100%',
          maxWidth: '400px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          border: '1px solid #e5e7eb',
          pointerEvents: 'auto' // Re-enable clicks for the search bar itself
        }}>
          <span style={{ color: '#9ca3af', fontSize: '16px' }}>🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              // Show search sheet only when there's actual search text
              setShowSearchSheet(e.target.value.trim().length > 0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.target.blur() // Hide keyboard on mobile
              }
            }}
            onFocus={() => {
              // Only show search sheet if there's already text
              if (searchQuery.trim().length > 0) {
                setShowSearchSheet(true)
              }
            }}
            onBlur={() => {
              // Don't immediately close on blur - let user interact with results
              // The sheet will close when they select a restaurant or tap the X
            }}
            placeholder="Search your saved places..."
            style={{
              border: 'none',
              outline: 'none',
              width: '100%',
              fontSize: '16px',
              color: '#374151',
              background: 'transparent',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('')
                setShowSearchSheet(false)
              }}
              style={{
                background: '#f3f4f6',
                border: 'none',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '12px',
                color: '#6b7280'
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="map-container" style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden', // Prevent any scrolling of the map container
        padding: 0, // Override any CSS padding
        margin: 0 // Override any CSS margin
      }}>
        {/* Custom Locate Me Button - Positioned within map container */}
        <button
          onClick={getCurrentLocation}
          style={{
            position: 'absolute',
            top: '70px', // Below search bar
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
            zIndex: 500 // Lower than bottom sheets
          }}
          title={userLocation ? 'Center on your location' : 'Find my location'}
        >
          📍
        </button>
        {/* Map */}
        <div 
          ref={mapRef} 
          style={{ 
            width: '100%',
            height: '100%', // Fill the fixed container
            borderRadius: '0',
            position: 'relative',
            zIndex: 1
          }} 
        />

      {selectedSavedRec && selectedRestaurant && (
        <UnifiedBottomSheet
          isVisible={!!selectedSavedRec}
          onClose={() => { setSelectedSavedRec(null); setSelectedRestaurant(null); }}
          type="restaurant"
          restaurant={selectedRestaurant}
          savedRec={selectedSavedRec}
          onDelete={handleDelete}
          onEdit={(updatedRec) => {
            setSelectedSavedRec(updatedRec);
            setSelectedRestaurant(updatedRec.restaurants);
            onRestaurantUpdate(updatedRec);
          }}
          supabase={supabase}
          height={searchSheetHeight}
          onHeightChange={setSearchSheetHeight}
        />
      )}

        {/* Search Bottom Sheet */}
        <UnifiedBottomSheet
          key="search-sheet"
          isVisible={showSearchSheet}
          onClose={() => setShowSearchSheet(false)}
          type="search"
          restaurants={restaurants}
          searchQuery={searchQuery}
          onRestaurantSelect={handleSearchRestaurantSelect}
          height={searchSheetHeight}
          onHeightChange={setSearchSheetHeight}
        />
      </div>
    </>
  )
}