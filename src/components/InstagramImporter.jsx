import React, { useState, useEffect, useRef } from 'react'
import { Loader } from '@googlemaps/js-api-loader'

export default function InstagramImporter({ supabase, session, onClose, onRestaurantAdded }) {
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('instagram') // 'instagram', 'screenshot', or 'manual'
  const [currentStep, setCurrentStep] = useState('') // Track what step we're on
  const [googleMaps, setGoogleMaps] = useState(null)
  
  // Instagram import state
  const [instagramUrl, setInstagramUrl] = useState('')
  const [extractedData, setExtractedData] = useState(null)
  
  // Screenshot import state
  const [selectedFile, setSelectedFile] = useState(null)
  const [screenshotData, setScreenshotData] = useState(null)
  
  // Manual import state
  const [restaurantName, setRestaurantName] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')

  // Add state for editable tags/notes after extraction
  const [editableTags, setEditableTags] = useState([])
  const [editableNotes, setEditableNotes] = useState('')
  const tagInputRef = useRef(null)

  // Add state for Google Places Autocomplete in manual entry
  const [manualSuggestions, setManualSuggestions] = useState([])
  const [manualAutocompleteLoading, setManualAutocompleteLoading] = useState(false)
  const [manualPlaceId, setManualPlaceId] = useState(null)

  // Add state for Google Places details in manual entry
  const [manualPlaceDetails, setManualPlaceDetails] = useState(null)

  // When extractedData changes, update editable fields
  useEffect(() => {
    if (extractedData) {
      setEditableTags(Array.isArray(extractedData.tags) ? extractedData.tags : [])
      setEditableNotes('') // Do not prefill notes
    }
  }, [extractedData])

  // Tag input handlers
  const handleTagInputKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const value = e.target.value.trim()
      if (value && !editableTags.includes(value)) {
        setEditableTags([...editableTags, value])
        e.target.value = ''
      }
    } else if (e.key === 'Backspace' && !e.target.value) {
      setEditableTags(editableTags.slice(0, -1))
    }
  }
  const handleRemoveTag = (tag) => {
    setEditableTags(editableTags.filter(t => t !== tag))
  }

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

  // Enhanced Google Places search using detailed extracted info
  const searchGooglePlacesWithQuery = async (searchQuery, extractedInfo) => {
    if (!googleMaps || import.meta.env.VITE_GOOGLE_MAPS_API_KEY === 'placeholder') {
      // Return enhanced mock data
      return {
        name: extractedInfo.name || 'Mock Restaurant',
        address: extractedInfo.address || "123 Main St, City, State 12345",
        phone: extractedInfo.phone || "(555) 123-4567",
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
      // Use Places Text Search with enhanced query
      const service = new googleMaps.maps.places.PlacesService(
        document.createElement('div')
      )

      const request = {
        query: searchQuery,
        type: 'restaurant',
        // Try to prevent location bias toward user's current location
        fields: ['place_id', 'name', 'formatted_address', 'geometry']
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
        user_notes: editableNotes,
        tags: editableTags,
        source_data: {
          sentiment: extractedData.sentiment,
          mentions: extractedData.mentions,
          confidence: extractedData.confidence,
          extraction_method: extractedData.source,
          photos: extractedData.photos,
          reviews: extractedData.reviews?.slice(0, 2)
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

  // Screenshot processing functions
  const handleFileSelect = (event) => {
    const file = event.target.files[0]
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file)
      setScreenshotData(null) // Reset previous data
    } else {
      alert('Please select an image file')
    }
  }

  const processScreenshot = async () => {
    if (!selectedFile) return

    setLoading(true)
    setCurrentStep('🤖 Analyzing screenshot with AI...')
    
    try {
      // Skip storage for now, just analyze the image
      // TODO: Fix storage policies and re-enable upload
      
      // Step 1: Use OpenAI Vision API to extract information
      const extractedInfo = await analyzeScreenshotWithAI(selectedFile)
      
      if (extractedInfo.name) {
        setCurrentStep('🗺️ Searching Google Places for restaurant details...')
        
        // Step 2: Search Google Places with ALL extracted info  
        let searchQuery = extractedInfo.name
        
        // Build the most specific search possible
        if (extractedInfo.address) {
          // Use exact address if available - most accurate
          searchQuery = `${extractedInfo.name} ${extractedInfo.address}`
        } else if (extractedInfo.neighborhood && extractedInfo.city) {
          // Use neighborhood + city if no exact address
          searchQuery = `${extractedInfo.name} ${extractedInfo.neighborhood} ${extractedInfo.city}`
        } else if (extractedInfo.locationHint) {
          // Fallback to general location hint
          searchQuery = `${extractedInfo.name} ${extractedInfo.locationHint}`
        }
        
        // Add cuisine type to help disambiguate if available
        if (extractedInfo.cuisine_type) {
          searchQuery += ` ${extractedInfo.cuisine_type} restaurant`
        }
        
        console.log('🔍 Searching Google Places with:', searchQuery)
        console.log('📊 AI extracted data:', extractedInfo)
        
        const googleData = await searchGooglePlacesWithQuery(searchQuery, extractedInfo)
        
        console.log('🏢 Google Places found:', googleData.name, 'at', googleData.address)
        
        setCurrentStep('🤖 Adding personal context analysis...')
        
        // Step 3: Combine data (without storage URL for now)
        const combinedData = {
          ...googleData,
          description: extractedInfo.description || `Saved from Instagram screenshot`,
          tags: extractedInfo.tags || ['screenshot', 'instagram'],
          sentiment: extractedInfo.sentiment || 'positive',
          confidence: 'screenshot-analysis',
          source: 'screenshot',
          screenshot_url: null, // Will add back when storage policies are fixed
          extracted_info: extractedInfo
        }
        
        setScreenshotData(combinedData)
        setCurrentStep('')
      } else {
        throw new Error('Could not extract restaurant information from screenshot')
      }
      
    } catch (error) {
      console.error('Screenshot processing failed:', error)
      alert('Failed to process screenshot: ' + error.message)
      setCurrentStep('')
    } finally {
      setLoading(false)
    }
  }

  const analyzeScreenshotWithAI = async (imageFile) => {
    if (import.meta.env.VITE_OPENAI_API_KEY === 'placeholder') {
      return {
        name: "Restaurant from Screenshot",
        locationHint: "",
        description: "Screenshot analysis - APIs not configured",
        tags: ["screenshot", "needs-setup"]
      }
    }

    try {
      // Convert image to base64
      const base64Image = await fileToBase64(imageFile)

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are analyzing Instagram screenshots to extract restaurant information. Extract ALL visible details for precise identification.

EXTRACT THESE DETAILS (if visible):
1. RESTAURANT NAME - from profile name, signage, or location tags
2. EXACT ADDRESS - street address, cross streets, specific location  
3. INSTAGRAM HANDLE - @restaurantname from profile or mentions
4. NEIGHBORHOOD/AREA - Chelsea, SoHo, Williamsburg, etc.
5. CITY - Manhattan, Brooklyn, specific city
6. CUISINE TYPE - Italian, Mexican, Middle Eastern, etc.
7. PHONE NUMBER - if visible in image or bio
8. HOURS - if shown anywhere
9. WEBSITE - if visible

LOCATION PRIORITY:
1. Exact street address (most important!)
2. Intersection or cross streets  
3. Neighborhood + city
4. General area

SEARCH STRATEGY:
- If you see a full address, extract it exactly
- Look for location tags that show the specific spot
- Check captions for address mentions
- Notice business info displayed in the image

Return detailed JSON: {
  "name": "exact restaurant name",
  "address": "full street address if visible", 
  "instagram_handle": "@handle",
  "neighborhood": "specific area",
  "city": "city name",
  "cuisine_type": "food type",
  "phone": "phone if visible",
  "locationHint": "combine all location info for search",
  "description": "brief description",
  "tags": ["cuisine", "style"],
  "confidence": "high/medium/low based on info available"
}`
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Analyze this Instagram screenshot. Look carefully at the profile name at the top, any location tags, and restaurant signage in the image. Extract the EXACT restaurant name and location. Be very precise:'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Image}`
                  }
                }
              ]
            }
          ],
          max_tokens: 300,
          temperature: 0.1
        })
      })

      const data = await response.json()
      
      try {
        let content = data.choices[0].message.content.trim()
        
        // Remove markdown code blocks if present
        if (content.startsWith('```json')) {
          content = content.replace(/```json\n?/, '').replace(/\n?```$/, '')
        } else if (content.startsWith('```')) {
          content = content.replace(/```\n?/, '').replace(/\n?```$/, '')
        }
        
        return JSON.parse(content)
      } catch (parseError) {
        console.error('JSON parsing failed:', parseError)
        console.log('Raw AI response:', data.choices[0].message.content)
        
        // Fallback if JSON parsing fails
        return {
          name: "Restaurant from Screenshot",
          locationHint: "",
          description: data.choices[0].message.content.trim(),
          tags: ["screenshot"]
        }
      }
    } catch (error) {
      console.error('OpenAI Vision analysis failed:', error)
      return {
        name: "Restaurant from Screenshot",
        locationHint: "",
        description: "Screenshot uploaded successfully",
        tags: ["screenshot"]
      }
    }
  }

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const base64 = reader.result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = error => reject(error)
    })
  }

  const handleSaveScreenshot = async () => {
    if (!screenshotData) return

    setLoading(true)
    try {
      // Create restaurant with enhanced data
      const restaurantData = {
        name: screenshotData.name,
        address: screenshotData.address,
        latitude: screenshotData.latitude,
        longitude: screenshotData.longitude,
        google_place_id: screenshotData.placeId,
        phone: screenshotData.phone,
        website: screenshotData.website,
        rating: screenshotData.rating,
        price_level: screenshotData.priceLevel,
        hours: screenshotData.hours,
      }

      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .insert([restaurantData])
        .select()
        .single()

      if (restaurantError) throw restaurantError

      // Create saved recommendation with screenshot data
      const savedRecData = {
        user_id: session.user.id,
        restaurant_id: restaurant.id,
        source_type: 'screenshot',
        source_url: screenshotData.screenshot_url,
        user_notes: screenshotEditableNotes,
        tags: screenshotEditableTags,
        source_data: {
          sentiment: screenshotData.sentiment,
          confidence: screenshotData.confidence,
          extraction_method: screenshotData.source,
          extracted_info: screenshotData.extracted_info,
          screenshot_url: screenshotData.screenshot_url,
          photos: screenshotData.photos,
          reviews: screenshotData.reviews?.slice(0, 2)
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
      // Create restaurant with basic info only
      const restaurantData = manualPlaceDetails ? {
        name: manualPlaceDetails.name,
        address: manualPlaceDetails.address,
        latitude: manualPlaceDetails.latitude,
        longitude: manualPlaceDetails.longitude,
        google_place_id: manualPlaceDetails.placeId,
        phone: manualPlaceDetails.phone,
        website: manualPlaceDetails.website,
        rating: manualPlaceDetails.rating,
        price_level: manualPlaceDetails.priceLevel,
        hours: manualPlaceDetails.hours,
      } : {
        name: restaurantName.trim(),
        address: address.trim() || null,
      }

      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .insert([restaurantData])
        .select()
        .single()

      if (restaurantError) throw restaurantError

      // Create saved recommendation with enhanced data in source_data
      const savedRecData = {
        user_id: session.user.id,
        restaurant_id: restaurant.id,
        source_type: 'manual',
        user_notes: notes.trim() || null,
        tags: editableTags,
      }

      // Add enhanced data to source_data if available
      if (manualPlaceDetails) {
        savedRecData.source_data = {
          photos: manualPlaceDetails.photos || [],
          reviews: manualPlaceDetails.reviews || [],
          types: manualPlaceDetails.types || [],
          confidence: 'google-places',
          extraction_method: 'manual-google-places'
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

  // Add state for screenshotEditableTags and screenshotEditableNotes
  const [screenshotEditableTags, setScreenshotEditableTags] = useState([])
  const [screenshotEditableNotes, setScreenshotEditableNotes] = useState('')
  const screenshotTagInputRef = useRef(null)
  useEffect(() => {
    if (screenshotData) {
      setScreenshotEditableTags(Array.isArray(screenshotData.tags) ? screenshotData.tags : [])
      setScreenshotEditableNotes('') // Do not prefill notes
    }
  }, [screenshotData])
  const handleScreenshotTagInputKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const value = e.target.value.trim()
      if (value && !screenshotEditableTags.includes(value)) {
        setScreenshotEditableTags([...screenshotEditableTags, value])
        e.target.value = ''
      }
    } else if (e.key === 'Backspace' && !e.target.value) {
      setScreenshotEditableTags(screenshotEditableTags.slice(0, -1))
    }
  }
  const handleRemoveScreenshotTag = (tag) => {
    setScreenshotEditableTags(screenshotEditableTags.filter(t => t !== tag))
  }

  // Fetch suggestions as user types
  useEffect(() => {
    if (activeTab !== 'manual' || !googleMaps) return
    if (!restaurantName.trim()) {
      setManualSuggestions([])
      return
    }
    setManualAutocompleteLoading(true)
    const service = new googleMaps.maps.places.AutocompleteService()
    service.getPlacePredictions({
      input: restaurantName,
      types: ['establishment'],
      componentRestrictions: { country: 'us' }, // Optional: restrict to US
    }, (predictions, status) => {
      setManualAutocompleteLoading(false)
      if (status === googleMaps.maps.places.PlacesServiceStatus.OK && predictions) {
        setManualSuggestions(predictions)
      } else {
        setManualSuggestions([])
      }
    })
  }, [restaurantName, activeTab, googleMaps])

  // Generate smart tags based on Google Places data
  const generateManualTags = async (placeDetails) => {
    if (import.meta.env.VITE_OPENAI_API_KEY === 'placeholder') {
      // Fallback tags based on place types and data
      const fallbackTags = []
      
      if (placeDetails.types) {
        if (placeDetails.types.includes('restaurant')) fallbackTags.push('restaurant')
        if (placeDetails.types.includes('bar')) fallbackTags.push('bar')
        if (placeDetails.types.includes('cafe')) fallbackTags.push('cafe')
        if (placeDetails.types.includes('bakery')) fallbackTags.push('bakery')
      }
      
      if (placeDetails.priceLevel) {
        if (placeDetails.priceLevel <= 2) fallbackTags.push('affordable')
        if (placeDetails.priceLevel >= 3) fallbackTags.push('upscale')
      }
      
      if (placeDetails.rating >= 4.5) fallbackTags.push('highly-rated')
      
      return fallbackTags.slice(0, 3) // Limit to 3 tags
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
              content: 'Generate 3-4 relevant tags for a restaurant based on its Google Places data. Focus on cuisine type, atmosphere, price level, and notable features. Return only a JSON array of strings: ["tag1", "tag2", "tag3"]'
            },
            {
              role: 'user',
              content: `Generate tags for: ${placeDetails.name} - ${placeDetails.address}. Types: ${placeDetails.types?.join(', ')}. Rating: ${placeDetails.rating}. Price level: ${placeDetails.priceLevel}. Reviews mention: ${placeDetails.reviews?.map(r => r.text).join(' ').slice(0, 200)}`
            }
          ],
          max_tokens: 100,
          temperature: 0.3
        })
      })

      const data = await response.json()
      const tags = JSON.parse(data.choices[0].message.content)
      return Array.isArray(tags) ? tags.slice(0, 4) : []
    } catch (error) {
      console.error('Tag generation failed:', error)
      // Fallback to simple tags
      const fallbackTags = ['restaurant']
      if (placeDetails.rating >= 4.5) fallbackTags.push('highly-rated')
      if (placeDetails.priceLevel <= 2) fallbackTags.push('affordable')
      return fallbackTags
    }
  }

  // On suggestion click, fetch full place details and fill fields
  const handleManualSuggestionClick = async (suggestion) => {
    setRestaurantName(suggestion.description)
    setManualSuggestions([])
    setManualPlaceId(suggestion.place_id)
    if (
      googleMaps &&
      googleMaps.maps &&
      googleMaps.maps.places &&
      googleMaps.maps.places.PlacesServiceStatus
    ) {
      const service = new googleMaps.maps.places.PlacesService(document.createElement('div'))
      service.getDetails({
        placeId: suggestion.place_id,
        fields: [
          'name', 'formatted_address', 'formatted_phone_number', 'website', 'rating', 'price_level', 'geometry',
          'opening_hours', 'photos', 'reviews', 'types'
        ]
      }, async (place, status) => {
        console.log('Google Places details:', place, status)
        if (status === googleMaps.maps.places.PlacesServiceStatus.OK && place) {
          setAddress(place.formatted_address || '')
          const placeDetails = {
            name: place.name,
            address: place.formatted_address,
            phone: place.formatted_phone_number,
            website: place.website,
            rating: place.rating,
            priceLevel: place.price_level,
            placeId: suggestion.place_id,
            latitude: place.geometry?.location?.lat(),
            longitude: place.geometry?.location?.lng(),
            hours: place.opening_hours ? {
              weekdayText: place.opening_hours.weekday_text,
              openNow: place.opening_hours.open_now
            } : null,
            photos: place.photos ? place.photos.slice(0, 3).map(photo => ({
              url: photo.getUrl({ maxWidth: 400, maxHeight: 400 })
            })) : [],
            reviews: place.reviews ? place.reviews.slice(0, 3).map(review => ({
              rating: review.rating,
              text: review.text,
              author: review.author_name,
              time: review.relative_time_description
            })) : [],
            types: place.types
          }
          setManualPlaceDetails(placeDetails)
          
          // Generate and set smart tags
          const smartTags = await generateManualTags(placeDetails)
          setEditableTags(smartTags)
        } else {
          console.warn('Google Places details fetch failed:', status, place)
        }
      })
    } else {
      console.error('Google Maps Places library not loaded!')
    }
  }

  return (
    <div className="modal" style={{ width: '95vw', maxWidth: 500, padding: 0, borderRadius: 12 }}>
      <div style={{ padding: '20px 0 0 0' }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '12px',
          borderBottom: '1px solid #e5e5e5',
          padding: '0 16px 12px 16px',
        }}>
          <h2 style={{ margin: 0, fontSize: 22 }}>Add Restaurant</h2>
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
        <div style={{ marginBottom: '16px', padding: '0 16px' }}>
          <div style={{ 
            display: 'flex', 
            borderBottom: '1px solid #e5e5e5',
            marginBottom: '0'
          }}>
            <button
              onClick={() => setActiveTab('instagram')}
              style={{
                flex: 1,
                padding: '12px 8px',
                border: 'none',
                background: activeTab === 'instagram' ? '#3b82f6' : 'transparent',
                color: activeTab === 'instagram' ? 'white' : '#374151',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                borderRadius: '0',
                transition: 'all 0.2s'
              }}
            >
              📷 Instagram Link
            </button>
            <button
              onClick={() => setActiveTab('screenshot')}
              style={{
                flex: 1,
                padding: '12px 8px',
                border: 'none',
                background: activeTab === 'screenshot' ? '#3b82f6' : 'transparent',
                color: activeTab === 'screenshot' ? 'white' : '#374151',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                borderRadius: '0',
                transition: 'all 0.2s'
              }}
            >
              🖼️ Screenshot
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              style={{
                flex: 1,
                padding: '12px 8px',
                border: 'none',
                background: activeTab === 'manual' ? '#3b82f6' : 'transparent',
                color: activeTab === 'manual' ? 'white' : '#374151',
                cursor: 'pointer',
                fontSize: '13px',
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
            <form onSubmit={handleInstagramImport} style={{ padding: '0 16px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label htmlFor="instagram-url" style={{ fontWeight: 600, fontSize: '15px', color: '#1e293b', marginBottom: '8px', display: 'block' }}>
                  Instagram Profile URL
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
              <div style={{ padding: '0 16px' }}>
                <div style={{ fontWeight: 600, fontSize: 17, margin: '18px 0 6px 0' }}>Smart Analysis Results</div>
                <hr style={{ border: 0, borderTop: '1px solid #e5e5e5', margin: '0 0 12px 0' }} />
                {/* Official Data */}
                <div style={{ marginBottom: 10 }}>
                  {extractedData.name && <div><strong>Name:</strong> {extractedData.name}</div>}
                  {extractedData.address && <div><strong>Address:</strong> {extractedData.address}</div>}
                  {extractedData.phone && <div><strong>Phone:</strong> {extractedData.phone}</div>}
                  {extractedData.rating && <div><strong>Rating:</strong> {extractedData.rating}⭐ ({extractedData.reviews?.length || 0} reviews)</div>}
                  {extractedData.hours?.openNow !== undefined && (
                    <div><strong>Status:</strong> <span style={{color: extractedData.hours.openNow ? '#059669' : '#dc2626'}}>{extractedData.hours.openNow ? 'Open Now' : 'Closed'}</span></div>
                  )}
                  {extractedData.website && <div><strong>Website:</strong> <a href={extractedData.website} target="_blank" rel="noopener noreferrer">{extractedData.website}</a></div>}
                </div>
                <div style={{ fontWeight: 600, fontSize: 16, margin: '18px 0 6px 0' }}>Personal Context</div>
                <hr style={{ border: 0, borderTop: '1px solid #e5e5e5', margin: '0 0 12px 0' }} />
                <div style={{ marginBottom: 10 }}>
                  <div style={{ marginBottom: 8 }}>
                    <strong>Personal Notes:</strong>
                    <textarea
                      value={editableNotes}
                      onChange={e => setEditableNotes(e.target.value)}
                      rows={2}
                      style={{
                        width: '100%',
                        marginTop: '4px',
                        padding: '8px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '15px',
                        resize: 'vertical',
                      }}
                      placeholder="Add your personal notes..."
                    />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <strong>Tags:</strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                      {editableTags.map((tag, idx) => (
                        <span key={tag} style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '8px', fontSize: '0.9em', display: 'flex', alignItems: 'center' }}>
                          {tag}
                          <button onClick={() => handleRemoveTag(tag)} style={{ marginLeft: 4, background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '1em' }} title="Remove tag">×</button>
                        </span>
                      ))}
                      <input
                        ref={tagInputRef}
                        type="text"
                        onKeyDown={handleTagInputKeyDown}
                        placeholder="Add tag"
                        style={{
                          border: 'none',
                          outline: 'none',
                          fontSize: '0.95em',
                          minWidth: 60,
                          maxWidth: 90,
                          background: '#3b82f6',
                          color: 'white',
                          borderRadius: '8px',
                          padding: '4px 12px',
                          marginLeft: '4px',
                          cursor: 'pointer',
                          transition: 'background 0.2s',
                          '::placeholder': { color: 'white', opacity: 1 },
                        }}
                      />
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleSaveExtracted}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px 0',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    opacity: loading ? 0.6 : 1,
                    fontSize: 17,
                    fontWeight: 600,
                    margin: '18px 0 0 0'
                  }}
                >
                  {loading ? 'Saving...' : 'Save to Haze'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Screenshot Tab */}
        {activeTab === 'screenshot' && (
          <div>
            <div style={{ marginBottom: '16px', padding: '0 16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Upload Instagram Screenshot
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px dashed #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  background: selectedFile ? '#f0f9ff' : '#fafafa'
                }}
              />
              {selectedFile && (
                <div style={{ 
                  marginTop: '8px', 
                  padding: '8px', 
                  background: '#f0f9ff', 
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#0369a1'
                }}>
                  ✅ Selected: {selectedFile.name}
                </div>
              )}
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

            {selectedFile && !screenshotData && (
              <button
                onClick={processScreenshot}
                disabled={loading}
                style={{
                  padding: '8px 16px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  opacity: loading ? 0.6 : 1,
                  marginBottom: '20px'
                }}
              >
                {loading ? 'Analyzing...' : '🔍 Analyze Screenshot'}
              </button>
            )}

            {/* Show analyzed data */}
            {screenshotData && (
              <div style={{ padding: '0 16px' }}>
                <div style={{ fontWeight: 600, fontSize: 17, margin: '18px 0 6px 0' }}>Smart Analysis Results</div>
                <hr style={{ border: 0, borderTop: '1px solid #e5e5e5', margin: '0 0 12px 0' }} />
                {/* Official Data */}
                <div style={{ marginBottom: 10 }}>
                  {screenshotData.name && <div><strong>Name:</strong> {screenshotData.name}</div>}
                  {screenshotData.address && <div><strong>Address:</strong> {screenshotData.address}</div>}
                  {screenshotData.phone && <div><strong>Phone:</strong> {screenshotData.phone}</div>}
                  {screenshotData.rating && <div><strong>Rating:</strong> {screenshotData.rating}⭐ ({screenshotData.reviews?.length || 0} reviews)</div>}
                  {screenshotData.hours?.openNow !== undefined && (
                    <div><strong>Status:</strong> <span style={{color: screenshotData.hours.openNow ? '#059669' : '#dc2626'}}>{screenshotData.hours.openNow ? 'Open Now' : 'Closed'}</span></div>
                  )}
                  {screenshotData.website && <div><strong>Website:</strong> <a href={screenshotData.website} target="_blank" rel="noopener noreferrer">{screenshotData.website}</a></div>}
                </div>
                <div style={{ fontWeight: 600, fontSize: 16, margin: '18px 0 6px 0' }}>Personal Context</div>
                <hr style={{ border: 0, borderTop: '1px solid #e5e5e5', margin: '0 0 12px 0' }} />
                <div style={{ marginBottom: 10 }}>
                  <div style={{ marginBottom: 8 }}>
                    <strong>Personal Notes:</strong>
                    <textarea
                      value={screenshotEditableNotes}
                      onChange={e => setScreenshotEditableNotes(e.target.value)}
                      rows={2}
                      style={{
                        width: '100%',
                        marginTop: '4px',
                        padding: '8px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '15px',
                        resize: 'vertical',
                      }}
                      placeholder="Add your personal notes..."
                    />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <strong>Tags:</strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                      {screenshotEditableTags.map((tag, idx) => (
                        <span key={tag} style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '8px', fontSize: '0.9em', display: 'flex', alignItems: 'center' }}>
                          {tag}
                          <button onClick={() => handleRemoveScreenshotTag(tag)} style={{ marginLeft: 4, background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '1em' }} title="Remove tag">×</button>
                        </span>
                      ))}
                      <input
                        ref={screenshotTagInputRef}
                        type="text"
                        onKeyDown={handleScreenshotTagInputKeyDown}
                        placeholder="Add tag"
                        style={{
                          border: 'none',
                          outline: 'none',
                          fontSize: '0.95em',
                          minWidth: 60,
                          maxWidth: 90,
                          background: '#3b82f6',
                          color: 'white',
                          borderRadius: '8px',
                          padding: '4px 12px',
                          marginLeft: '4px',
                          cursor: 'pointer',
                          transition: 'background 0.2s',
                          '::placeholder': { color: 'white', opacity: 1 },
                        }}
                      />
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleSaveScreenshot}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px 0',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    opacity: loading ? 0.6 : 1,
                    fontSize: 17,
                    fontWeight: 600,
                    margin: '18px 0 0 0'
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
          <form onSubmit={handleManualSubmit} style={{ padding: '0 16px' }}>
            <div style={{ marginBottom: '16px', position: 'relative' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                Restaurant Name
              </label>
              <input
                type="text"
                value={restaurantName}
                onChange={e => {
                  setRestaurantName(e.target.value)
                  setManualPlaceId(null)
                }}
                placeholder="e.g. Joe's Pizza"
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
                autoComplete="off"
              />
              {/* Suggestions dropdown */}
              {manualSuggestions.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'white',
                  border: '1px solid #d1d5db',
                  borderTop: 'none',
                  borderRadius: '0 0 8px 8px',
                  zIndex: 1000,
                  maxHeight: 180,
                  overflowY: 'auto',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }}>
                  {manualSuggestions.map(suggestion => (
                    <div
                      key={suggestion.place_id}
                      onClick={() => handleManualSuggestionClick(suggestion)}
                      style={{
                        padding: '10px 14px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f1f5f9',
                        background: '#fff',
                        fontSize: 15
                      }}
                    >
                      {suggestion.description}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                Address
              </label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="123 Main St, City, State"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
                autoComplete="off"
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                Personal Notes
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '15px',
                  resize: 'vertical',
                }}
                placeholder="Add your personal notes..."
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                Tags
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                {editableTags.map((tag, idx) => (
                  <span key={tag} style={{ background: '#eff6ff', color: '#3b82f6', padding: '4px 8px', borderRadius: '8px', fontSize: '0.9em', display: 'flex', alignItems: 'center' }}>
                    {tag}
                    <button onClick={() => handleRemoveTag(tag)} style={{ marginLeft: 4, background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '1em' }} title="Remove tag">×</button>
                  </span>
                ))}
                <input
                  ref={tagInputRef}
                  type="text"
                  onKeyDown={handleTagInputKeyDown}
                  placeholder="Add tag"
                  style={{
                    border: 'none',
                    outline: 'none',
                    fontSize: '0.95em',
                    minWidth: 60,
                    maxWidth: 90,
                    background: '#3b82f6',
                    color: 'white',
                    borderRadius: '8px',
                    padding: '4px 12px',
                    marginLeft: '4px',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    '::placeholder': { color: 'white', opacity: 1 },
                  }}
                />
              </div>
            </div>
            {/* Show Google Places details if available */}
            {manualPlaceDetails && (
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12, marginBottom: 16, border: '1px solid #e5e7eb' }}>
                <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Google Places Details</div>
                <div style={{ marginBottom: 6 }}>
                  <strong>Name:</strong> {manualPlaceDetails.name}
                </div>
                <div style={{ marginBottom: 6 }}>
                  <strong>Address:</strong> {manualPlaceDetails.address}
                </div>
                {manualPlaceDetails.phone && (
                  <div style={{ marginBottom: 6 }}>
                    <strong>Phone:</strong> {manualPlaceDetails.phone}
                  </div>
                )}
                {manualPlaceDetails.rating && (
                  <div style={{ marginBottom: 6 }}>
                    <strong>Rating:</strong> {manualPlaceDetails.rating} ⭐
                  </div>
                )}
                {manualPlaceDetails.priceLevel && (
                  <div style={{ marginBottom: 6 }}>
                    <strong>Price:</strong> {'$'.repeat(manualPlaceDetails.priceLevel)}
                  </div>
                )}
                {manualPlaceDetails.website && (
                  <div style={{ marginBottom: 6 }}>
                    <strong>Website:</strong> <a href={manualPlaceDetails.website} target="_blank" rel="noopener noreferrer">{manualPlaceDetails.website}</a>
                  </div>
                )}
                {manualPlaceDetails.hours && manualPlaceDetails.hours.weekdayText && (
                  <div style={{ marginBottom: 6 }}>
                    <strong>Hours:</strong> <span style={{ fontSize: 13 }}>{manualPlaceDetails.hours.weekdayText.join(', ')}</span>
                  </div>
                )}
                {manualPlaceDetails.photos && manualPlaceDetails.photos.length > 0 && (
                  <div style={{ marginBottom: 6 }}>
                    <strong>Photos:</strong>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      {manualPlaceDetails.photos.map((photo, idx) => (
                        <img key={idx} src={photo.url} alt="Restaurant" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6 }} />
                      ))}
                    </div>
                  </div>
                )}
                {manualPlaceDetails.reviews && manualPlaceDetails.reviews.length > 0 && (
                  <div style={{ marginBottom: 6 }}>
                    <strong>Reviews:</strong>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                      {manualPlaceDetails.reviews.map((review, idx) => (
                        <li key={idx} style={{ marginBottom: 4 }}>
                          <span style={{ color: '#f59e42' }}>★</span> {review.rating} — "{review.text}" <span style={{ color: '#64748b' }}>by {review.author}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            <button
              type="submit"
              disabled={loading || !restaurantName.trim()}
              style={{
                width: '100%',
                padding: '12px 0',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                opacity: loading || !restaurantName.trim() ? 0.6 : 1,
                fontSize: 17,
                fontWeight: 600,
                margin: '18px 0 10px 0'
              }}
            >
              {loading ? 'Saving...' : 'Save to haze'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
} 