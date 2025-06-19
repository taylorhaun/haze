#!/usr/bin/env node

/**
 * One-time script to enhance older restaurants with Google Places photos/reviews
 * This fixes the issue where older restaurants have source_data: null
 */

import { createClient } from '@supabase/supabase-js'
import pkg from '@googlemaps/js-api-loader'
const { Loader } = pkg
import dotenv from 'dotenv'
import { JSDOM } from 'jsdom'

// Setup DOM environment for Google Maps
const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`, {
  url: 'http://localhost',
  pretendToBeVisual: true,
  resources: 'usable'
})

global.window = dom.window
global.document = dom.window.document
global.navigator = dom.window.navigator

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for admin operations
)

const GOOGLE_MAPS_API_KEY = process.env.VITE_GOOGLE_MAPS_API_KEY

async function initGoogleMaps() {
  if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'placeholder') {
    throw new Error('Google Maps API key not configured')
  }

  const loader = new Loader({
    apiKey: GOOGLE_MAPS_API_KEY,
    version: 'weekly',
    libraries: ['places']
  })

  return await loader.load()
}

async function enhanceRestaurantWithPlaces(restaurant, googleMaps) {
  try {
    console.log(`🔍 Enhancing: ${restaurant.name}`)
    
    // Create search query
    const searchQuery = restaurant.address ? 
      `${restaurant.name} ${restaurant.address}` : 
      restaurant.name

    return new Promise((resolve, reject) => {
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
            fields: ['photos', 'reviews', 'types', 'opening_hours']
          }

          service.getDetails(detailRequest, (placeDetails, detailStatus) => {
            if (detailStatus === googleMaps.maps.places.PlacesServiceStatus.OK) {
              const enhancedData = {
                photos: placeDetails.photos ? placeDetails.photos.slice(0, 3).map(photo => ({
                  url: photo.getUrl({ maxWidth: 400, maxHeight: 400 })
                })) : [],
                
                reviews: placeDetails.reviews ? placeDetails.reviews.slice(0, 3).map(review => ({
                  rating: review.rating,
                  text: review.text,
                  author: review.author_name,
                  time: review.relative_time_description
                })) : [],
                
                types: placeDetails.types || [],
                confidence: 'google-places-batch',
                extraction_method: 'batch-enhancement',
                enhanced_at: new Date().toISOString()
              }
              
              console.log(`✅ Enhanced ${restaurant.name}: ${enhancedData.photos.length} photos, ${enhancedData.reviews.length} reviews`)
              resolve(enhancedData)
            } else {
              console.log(`❌ Failed to get details for ${restaurant.name}: ${detailStatus}`)
              resolve(null)
            }
          })
        } else {
          console.log(`❌ Restaurant not found in Google Places: ${restaurant.name}`)
          resolve(null)
        }
      })
    })
  } catch (error) {
    console.error(`❌ Error enhancing ${restaurant.name}:`, error)
    return null
  }
}

async function updateSavedRecsWithEnhancement(restaurantId, enhancedData) {
  try {
    // Find saved_recs for this restaurant that have null source_data
    const { data: savedRecs, error: fetchError } = await supabase
      .from('saved_recs')
      .select('id, source_data')
      .eq('restaurant_id', restaurantId)
      .is('source_data', null)

    if (fetchError) throw fetchError

    if (savedRecs.length === 0) {
      console.log(`   No saved_recs with null source_data found`)
      return
    }

    console.log(`   Updating ${savedRecs.length} saved_recs with enhanced data`)

    // Update each saved_rec with the enhanced data
    const updatePromises = savedRecs.map(savedRec => 
      supabase
        .from('saved_recs')
        .update({ source_data: enhancedData })
        .eq('id', savedRec.id)
    )

    await Promise.all(updatePromises)
    console.log(`   ✅ Updated ${savedRecs.length} saved_recs`)

  } catch (error) {
    console.error(`   ❌ Error updating saved_recs:`, error)
  }
}

async function main() {
  try {
    console.log('🚀 Starting restaurant enhancement batch job...')
    
    // Initialize Google Maps
    console.log('📍 Initializing Google Maps...')
    const googleMaps = await initGoogleMaps()
    console.log('✅ Google Maps initialized')

    // Find restaurants that need enhancement
    console.log('🔍 Finding restaurants that need enhancement...')
    
    // Get restaurants that have saved_recs with null source_data
    const { data: restaurantsToEnhance, error } = await supabase
      .from('restaurants')
      .select(`
        id, name, address, google_place_id,
        saved_recs!inner(id, source_data)
      `)
      .is('saved_recs.source_data', null)
      .limit(50) // Start with 50 restaurants to manage API costs

    if (error) throw error

    // Remove duplicates (restaurants might appear multiple times if they have multiple null saved_recs)
    const uniqueRestaurants = restaurantsToEnhance.reduce((acc, curr) => {
      if (!acc.find(r => r.id === curr.id)) {
        acc.push({
          id: curr.id,
          name: curr.name,
          address: curr.address,
          google_place_id: curr.google_place_id
        })
      }
      return acc
    }, [])

    console.log(`📊 Found ${uniqueRestaurants.length} restaurants to enhance`)

    if (uniqueRestaurants.length === 0) {
      console.log('🎉 No restaurants need enhancement!')
      return
    }

    // Process restaurants in batches to avoid rate limits
    const BATCH_SIZE = 5
    const DELAY_BETWEEN_BATCHES = 2000 // 2 seconds

    for (let i = 0; i < uniqueRestaurants.length; i += BATCH_SIZE) {
      const batch = uniqueRestaurants.slice(i, i + BATCH_SIZE)
      console.log(`\n🔄 Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(uniqueRestaurants.length/BATCH_SIZE)}`)

      const enhancementPromises = batch.map(async (restaurant) => {
        const enhancedData = await enhanceRestaurantWithPlaces(restaurant, googleMaps)
        
        if (enhancedData && (enhancedData.photos.length > 0 || enhancedData.reviews.length > 0)) {
          await updateSavedRecsWithEnhancement(restaurant.id, enhancedData)
          return { restaurant: restaurant.name, success: true, photos: enhancedData.photos.length, reviews: enhancedData.reviews.length }
        } else {
          return { restaurant: restaurant.name, success: false, reason: 'No data found' }
        }
      })

      const results = await Promise.all(enhancementPromises)
      
      // Log batch results
      results.forEach(result => {
        if (result.success) {
          console.log(`   ✅ ${result.restaurant}: ${result.photos} photos, ${result.reviews} reviews`)
        } else {
          console.log(`   ❌ ${result.restaurant}: ${result.reason}`)
        }
      })

      // Delay between batches to respect rate limits
      if (i + BATCH_SIZE < uniqueRestaurants.length) {
        console.log(`   ⏳ Waiting ${DELAY_BETWEEN_BATCHES/1000}s before next batch...`)
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES))
      }
    }

    console.log('\n🎉 Batch enhancement complete!')
    console.log('📊 Summary:')
    
    // Get final stats
    const { data: finalStats } = await supabase
      .from('saved_recs')
      .select('source_data')
      .not('source_data', 'is', null)
    
    console.log(`   Enhanced saved_recs: ${finalStats?.length || 0}`)
    console.log(`\n💡 Tip: Run this script again later to enhance more restaurants as needed`)

  } catch (error) {
    console.error('❌ Enhancement failed:', error)
    process.exit(1)
  }
}

// Run the script
main() 