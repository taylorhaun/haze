import React, { useState, useEffect } from 'react'
import { Loader } from '@googlemaps/js-api-loader'

export default function InstagramImporter({ supabase, session, onClose, onRestaurantAdded }) {
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('instagram') // 'instagram' or 'manual'
  const [currentStep, setCurrentStep] = useState('') // Track what step we're on
  const [googleMaps, setGoogleMaps] = useState(null)
  
  // Instagram import state
  const [instagramUrl, setInstagramUrl] = useState('')
  const [extractedData, setExtractedData] = useState(null)
  
  // Manual import state
  const [restaurantName, setRestaurantName] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')

  // Initialize Google Maps
  useEffect(() => {
    const initGoogleMaps = async () => {
      if (import.meta.env.VITE_GOOGLE_MAPS_API_KEY !== 'placeholder') {
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
        }
      }
    }
    
    initGoogleMaps()
  }, [])

  const handleInstagramImport = async (e) => {
    e.preventDefault()
    if (!instagramUrl.trim()) return

    setLoading(true)
    setCurrentStep('Extracting restaurant name from Instagram...')
    
    try {
      // Step 1: Quick AI call to extract just the restaurant name and location hints
      const extractionResult = await extractRestaurantInfo(instagramUrl)
      setCurrentStep(`Found "${extractionResult.name}". Searching Google Places...`)
      
      // Step 2: Search Google Places for official restaurant data
      const googlePlacesData = await searchGooglePlacesSDK(extractionResult.name, extractionResult.locationHint)
      setCurrentStep('Analyzing post for personal insights...')
      
      // Step 3: AI analysis for personal context and tags  
      const personalContext = await analyzePersonalContext(instagramUrl, googlePlacesData.name)
      setCurrentStep('Complete!')
      
      // Step 4: Combine Google Places data + personal insights
      const combinedData = {
        // Official data from Google Places
        ...googlePlacesData,
        
        // Personal insights from AI
        description: personalContext.description,
        tags: personalContext.tags,
        sentiment: personalContext.sentiment,
        mentions: personalContext.mentions,
        
        // Meta
        source: 'instagram + google_places',
        confidence: 'high'
      }
      
      setExtractedData(combinedData)
      alert('Instagram post fully analyzed! Review the enhanced data below.')
      
    } catch (error) {
      console.error('Error processing Instagram URL:', error)
      setCurrentStep('')
      
      // Fallback to simpler extraction
      const fallbackData = await fallbackAnalysis(instagramUrl)
      setExtractedData(fallbackData)
      alert('Using fallback analysis. Some APIs may not be configured yet.')
    } finally {
      setLoading(false)
      setCurrentStep('')
    }
  }

  // Step 1: Extract restaurant name AND location hints using AI
  const extractRestaurantInfo = async (instagramUrl) => {
    if (import.meta.env.VITE_OPENAI_API_KEY === 'placeholder') {
      return {
        name: "Restaurant from Instagram",
        locationHint: ""
      }
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'Extract restaurant information from Instagram URLs. Return JSON with "name" (restaurant name) and "locationHint" (city, neighborhood, or area if mentioned). Example: {"name": "Joe\'s Pizza", "locationHint": "Brooklyn NYC"}'
            },
            {
              role: 'user',
              content: `Extract restaurant name and location from: ${instagramUrl}`
            }
          ],
          max_tokens: 100,
          temperature: 0.1
        })
      })

      const data = await response.json()
      try {
        return JSON.parse(data.choices[0].message.content)
      } catch {
        return {
          name: data.choices[0].message.content.trim(),
          locationHint: ""
        }
      }
    } catch (error) {
      console.error('OpenAI extraction failed:', error)
      return {
        name: "Restaurant from Instagram", 
        locationHint: ""
      }
    }
  }

  // Step 2: Search Google Places using the JavaScript SDK (no CORS issues!)
  const searchGooglePlacesSDK = async (restaurantName, locationHint) => {
    if (!googleMaps || import.meta.env.VITE_GOOGLE_MAPS_API_KEY === 'placeholder') {
      // Return enhanced mock data
      return {
        name: restaurantName,
        address: "123 Main St, City, State 12345",
        phone: "(555) 123-4567",
        website: "https://restaurant-website.com",
        rating: 4.2,
        priceLevel: 2,
        placeId: "mock_place_id",
        latitude: 40.7128,
        longitude: -74.0060,
        hours: {
          monday: "9:00 AM – 9:00 PM",
          tuesday: "9:00 AM – 9:00 PM", 
          status: "Open"
        },
        photos: [],
        reviews: [
          { rating: 5, text: "Amazing food!", author: "Jane D." },
          { rating: 4, text: "Great atmosphere", author: "John S." }
        ]
      }
    }

    return new Promise((resolve, reject) => {
      // Create a search query
      const searchQuery = locationHint ? 
        `${restaurantName} ${locationHint}` : 
        restaurantName

      // Use Places Text Search
      const service = new googleMaps.maps.places.PlacesService(
        document.createElement('div')
      )

      const request = {
        query: searchQuery,
        type: 'restaurant'
      }

      service.textSearch(request, (results, status) => {
        if (status === googleMaps.maps.places.PlacesServiceStatus.OK && results.length > 0) {
          const place = results[0]
          
          // Get detailed information
          const detailRequest = {
            placeId: place.place_id,
            fields: [
              'name', 'formatted_address', 'formatted_phone_number', 
              'website', 'rating', 'price_level', 'geometry',
              'opening_hours', 'photos', 'reviews', 'types'
            ]
          }

          service.getDetails(detailRequest, (placeDetails, detailStatus) => {
            if (detailStatus === googleMaps.maps.places.PlacesServiceStatus.OK) {
              const data = {
                name: placeDetails.name,
                address: placeDetails.formatted_address,
                phone: placeDetails.formatted_phone_number,
                website: placeDetails.website,
                rating: placeDetails.rating,
                priceLevel: placeDetails.price_level,
                placeId: place.place_id,
                latitude: placeDetails.geometry?.location?.lat(),
                longitude: placeDetails.geometry?.location?.lng(),
                
                // Enhanced data we couldn't get before!
                hours: placeDetails.opening_hours ? {
                  weekdayText: placeDetails.opening_hours.weekday_text,
                  openNow: placeDetails.opening_hours.open_now
                } : null,
                
                photos: placeDetails.photos ? placeDetails.photos.slice(0, 3).map(photo => ({
                  url: photo.getUrl({ maxWidth: 400, maxHeight: 400 })
                })) : [],
                
                reviews: placeDetails.reviews ? placeDetails.reviews.slice(0, 3).map(review => ({
                  rating: review.rating,
                  text: review.text,
                  author: review.author_name,
                  time: review.relative_time_description
                })) : [],
                
                types: placeDetails.types
              }
              
              resolve(data)
            } else {
              reject(new Error('Failed to get place details'))
            }
          })
        } else {
          reject(new Error('Restaurant not found in Google Places'))
        }
      })
    })
  }

  // Step 3: AI analysis for personal context (enhanced)
  const analyzePersonalContext = async (instagramUrl, restaurantName) => {
    if (import.meta.env.VITE_OPENAI_API_KEY === 'placeholder') {
      return {
        description: `Saved from Instagram: ${instagramUrl}`,
        tags: ["instagram", "new", "trending"],
        sentiment: "positive",
        mentions: ["great vibes", "must try"]
      }
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'Analyze Instagram posts about restaurants. Extract personal context, sentiment, and generate relevant tags. Focus on WHY someone would save this place. Return JSON: {"description": "personal reason for saving", "tags": ["descriptive", "tags"], "sentiment": "positive/neutral/negative", "mentions": ["specific things mentioned"]}'
            },
            {
              role: 'user',
              content: `Analyze why someone would save ${restaurantName} from this Instagram post: ${instagramUrl}`
            }
          ],
          max_tokens: 200,
          temperature: 0.3
        })
      })

      const data = await response.json()
      const analysis = JSON.parse(data.choices[0].message.content)
      return analysis
    } catch (error) {
      console.error('Personal context analysis failed:', error)
      return {
        description: `Instagram-worthy spot! ${restaurantName} caught your attention.`,
        tags: ["instagram", "recommended", "trendy"],
        sentiment: "positive", 
        mentions: ["worth the visit"]
      }
    }
  }

  // Fallback analysis when APIs aren't configured
  const fallbackAnalysis = async (instagramUrl) => {
    const postMatch = instagramUrl.match(/\/p\/([A-Za-z0-9_-]+)/)
    const postId = postMatch ? postMatch[1] : 'unknown'
    
    return {
      name: `Restaurant from post ${postId.slice(0, 6)}...`,
      address: "Google Places API needed for address",
      description: `Saved from Instagram: ${instagramUrl}`,
      tags: ["instagram", "needs-setup"],
      confidence: "low - APIs not configured",
      source: 'fallback'
    }
  }

  const handleSaveExtracted = async () => {
    if (!extractedData) return

    setLoading(true)
    try {
      // Create restaurant with enhanced data
      const restaurantData = {
        name: extractedData.name,
        address: extractedData.address,
        latitude: extractedData.latitude,
        longitude: extractedData.longitude,
        google_place_id: extractedData.placeId,
        phone: extractedData.phone,
        website: extractedData.website,
        rating: extractedData.rating,
        price_level: extractedData.priceLevel,
        hours: extractedData.hours,
      }

      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .insert([restaurantData])
        .select()
        .single()

      if (restaurantError) throw restaurantError

      // Create saved recommendation with personal context
      const savedRecData = {
        user_id: session.user.id,
        restaurant_id: restaurant.id,
        source_type: 'instagram',
        source_url: instagramUrl,
        user_notes: extractedData.description,
        tags: extractedData.tags,
        source_data: {
          sentiment: extractedData.sentiment,
          mentions: extractedData.mentions,
          confidence: extractedData.confidence,
          extraction_method: extractedData.source,
          photos: extractedData.photos,
          reviews: extractedData.reviews?.slice(0, 2) // Save some reviews
        }
      }

      const { error: savedRecError } = await supabase
        .from('saved_recs')
        .insert([savedRecData])

      if (savedRecError) throw savedRecError

      onRestaurantAdded()
    } catch (error) {
      console.error('Error saving restaurant:', error)
      alert('Error saving restaurant: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleManualSubmit = async (e) => {
    e.preventDefault()
    if (!restaurantName.trim()) return

    setLoading(true)
    try {
      // Create restaurant
      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .insert([{
          name: restaurantName.trim(),
          address: address.trim() || null,
        }])
        .select()
        .single()

      if (restaurantError) throw restaurantError

      // Create saved recommendation
      const { error: savedRecError } = await supabase
        .from('saved_recs')
        .insert([{
          user_id: session.user.id,
          restaurant_id: restaurant.id,
          source_type: 'manual',
          user_notes: notes.trim() || null,
        }])

      if (savedRecError) throw savedRecError

      onRestaurantAdded()
    } catch (error) {
      console.error('Error saving restaurant:', error)
      alert('Error saving restaurant: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div style={{ padding: '24px' }}>
          {/* Header */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '20px',
            borderBottom: '1px solid #e5e5e5',
            paddingBottom: '15px'
          }}>
            <h2 style={{ margin: 0 }}>Add Restaurant</h2>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '0',
                color: '#6b7280'
              }}
            >
              ❌
            </button>
          </div>

          {/* Tab Selector */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ 
              display: 'flex', 
              borderBottom: '1px solid #e5e5e5',
              marginBottom: '20px'
            }}>
              <button
                onClick={() => setActiveTab('instagram')}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  border: 'none',
                  background: activeTab === 'instagram' ? '#3b82f6' : 'transparent',
                  color: activeTab === 'instagram' ? 'white' : '#374151',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  borderRadius: '0',
                  transition: 'all 0.2s'
                }}
              >
                📷 From Instagram
              </button>
              <button
                onClick={() => setActiveTab('manual')}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  border: 'none',
                  background: activeTab === 'manual' ? '#3b82f6' : 'transparent',
                  color: activeTab === 'manual' ? 'white' : '#374151',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  borderRadius: '0',
                  transition: 'all 0.2s'
                }}
              >
                ✏️ Manual Entry
              </button>
            </div>
          </div>

          {/* Instagram Import Tab */}
          {activeTab === 'instagram' && (
            <div>
              <form onSubmit={handleInstagramImport}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                    Instagram Post URL
                  </label>
                  <input
                    type="url"
                    value={instagramUrl}
                    onChange={(e) => setInstagramUrl(e.target.value)}
                    placeholder="https://www.instagram.com/p/..."
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                  />
                </div>

                {/* Show current step */}
                {loading && currentStep && (
                  <div style={{ 
                    background: '#eff6ff', 
                    padding: '12px', 
                    borderRadius: '8px', 
                    marginBottom: '16px',
                    color: '#3b82f6'
                  }}>
                    {currentStep}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !instagramUrl.trim()}
                  style={{
                    padding: '8px 16px',
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    opacity: loading || !instagramUrl.trim() ? 0.6 : 1,
                    marginBottom: '20px'
                  }}
                >
                  {loading ? 'Analyzing...' : 'Smart Extract (Google + AI)'}
                </button>
              </form>

              {/* Show extracted data */}
              {extractedData && (
                <div style={{ 
                  background: '#f8fafc', 
                  padding: '16px', 
                  borderRadius: '8px',
                  marginBottom: '16px'
                }}>
                  <h3 style={{ marginBottom: '12px' }}>
                    🔍 Smart Analysis Results:
                  </h3>
                  
                  {/* Official Google Places Data */}
                  <div style={{ marginBottom: '12px', background: '#ffffff', padding: '12px', borderRadius: '6px' }}>
                    <h4 style={{ marginBottom: '8px', color: '#059669' }}>📍 Official Restaurant Data:</h4>
                    <div style={{ marginBottom: '4px' }}>
                      <strong>Name:</strong> {extractedData.name}
                    </div>
                    <div style={{ marginBottom: '4px' }}>
                      <strong>Address:</strong> {extractedData.address}
                    </div>
                    {extractedData.phone && (
                      <div style={{ marginBottom: '4px' }}>
                        <strong>Phone:</strong> {extractedData.phone}
                      </div>
                    )}
                    {extractedData.rating && (
                      <div style={{ marginBottom: '4px' }}>
                        <strong>Rating:</strong> {extractedData.rating}⭐ ({extractedData.reviews?.length || 0} reviews)
                      </div>
                    )}
                    {extractedData.hours?.openNow !== undefined && (
                      <div style={{ marginBottom: '4px' }}>
                        <strong>Status:</strong> <span style={{color: extractedData.hours.openNow ? '#059669' : '#dc2626'}}>
                          {extractedData.hours.openNow ? 'Open Now' : 'Closed'}
                        </span>
                      </div>
                    )}
                    {extractedData.website && (
                      <div style={{ marginBottom: '4px' }}>
                        <strong>Website:</strong> <a href={extractedData.website} target="_blank" rel="noopener noreferrer">{extractedData.website}</a>
                      </div>
                    )}
                  </div>

                  {/* Personal Context from AI */}
                  <div style={{ marginBottom: '12px', background: '#ffffff', padding: '12px', borderRadius: '6px' }}>
                    <h4 style={{ marginBottom: '8px', color: '#3b82f6' }}>🤖 Personal Context:</h4>
                    <div style={{ marginBottom: '4px' }}>
                      <strong>Why you saved this:</strong> {extractedData.description}
                    </div>
                    {extractedData.tags && (
                      <div style={{ marginBottom: '4px' }}>
                        <strong>Tags:</strong> {extractedData.tags.join(', ')}
                      </div>
                    )}
                    {extractedData.sentiment && (
                      <div style={{ marginBottom: '4px' }}>
                        <strong>Sentiment:</strong> {extractedData.sentiment}
                      </div>
                    )}
                    {extractedData.mentions && extractedData.mentions.length > 0 && (
                      <div style={{ marginBottom: '4px' }}>
                        <strong>Mentions:</strong> {extractedData.mentions.join(', ')}
                      </div>
                    )}
                  </div>

                  {extractedData.confidence && (
                    <div style={{ marginBottom: '12px', fontSize: '14px', color: '#666' }}>
                      <strong>Analysis method:</strong> {extractedData.source || extractedData.confidence}
                    </div>
                  )}
                  
                  <button
                    onClick={handleSaveExtracted}
                    disabled={loading}
                    style={{
                      padding: '8px 16px',
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      opacity: loading ? 0.6 : 1
                    }}
                  >
                    {loading ? 'Saving...' : 'Save to Haze'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Manual Entry Tab */}
          {activeTab === 'manual' && (
            <form onSubmit={handleManualSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  Restaurant Name *
                </label>
                <input
                  type="text"
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  placeholder="Enter restaurant name"
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter address (optional)"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any notes about this restaurant?"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '16px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '8px 16px',
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !restaurantName.trim()}
                  style={{
                    padding: '8px 16px',
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    opacity: loading || !restaurantName.trim() ? 0.6 : 1
                  }}
                >
                  {loading ? 'Saving...' : 'Save Restaurant'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
} 