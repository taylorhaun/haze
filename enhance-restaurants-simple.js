#!/usr/bin/env node

/**
 * Simplified restaurant enhancement script using Google Places Web API
 * This fixes the issue where older restaurants have source_data: null
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const GOOGLE_MAPS_API_KEY = process.env.VITE_GOOGLE_MAPS_API_KEY

async function findPlaceByQuery(searchQuery) {
  try {
    console.log(`🔍 Searching: ${searchQuery}`)
    
    // Step 1: Find Place Text Search
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&type=restaurant&key=${GOOGLE_MAPS_API_KEY}`
    
    const searchResponse = await fetch(searchUrl)
    const searchData = await searchResponse.json()
    
    if (searchData.status !== 'OK' || !searchData.results.length) {
      console.log(`❌ No place found for: ${searchQuery}`)
      return null
    }
    
    const placeId = searchData.results[0].place_id
    console.log(`✅ Found place_id: ${placeId}`)
    
    // Step 2: Get Place Details with photos and reviews
    const fields = 'photos,reviews,types'
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${GOOGLE_MAPS_API_KEY}`
    
    const detailsResponse = await fetch(detailsUrl)
    const detailsData = await detailsResponse.json()
    
    if (detailsData.status !== 'OK') {
      console.log(`❌ Failed to get details for place_id: ${placeId}`)
      return null
    }
    
    const place = detailsData.result
    
    // Process photos - get URLs
    const photos = place.photos ? place.photos.slice(0, 3).map(photo => ({
      url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${GOOGLE_MAPS_API_KEY}`
    })) : []
    
    // Process reviews
    const reviews = place.reviews ? place.reviews.slice(0, 3).map(review => ({
      rating: review.rating,
      text: review.text,
      author: review.author_name,
      time: review.relative_time_description
    })) : []
    
    const enhancedData = {
      photos,
      reviews,
      types: place.types || [],
      confidence: 'google-places-api',
      extraction_method: 'batch-enhancement-simple',
      enhanced_at: new Date().toISOString()
    }
    
    console.log(`✅ Enhanced: ${photos.length} photos, ${reviews.length} reviews`)
    return enhancedData
    
  } catch (error) {
    console.error(`❌ Error searching for ${searchQuery}:`, error.message)
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
    
    if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'placeholder') {
      throw new Error('Google Maps API key not configured')
    }

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
      .limit(20) // Start with 20 restaurants to manage API costs

    if (error) throw error

    // Remove duplicates
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

    // Process restaurants with delays to avoid rate limits
    let successCount = 0
    let failureCount = 0

    for (let i = 0; i < uniqueRestaurants.length; i++) {
      const restaurant = uniqueRestaurants[i]
      console.log(`\n🔄 Processing ${i + 1}/${uniqueRestaurants.length}: ${restaurant.name}`)
      
      // Create search query
      const searchQuery = restaurant.address ? 
        `${restaurant.name} ${restaurant.address}` : 
        restaurant.name

      const enhancedData = await findPlaceByQuery(searchQuery)
      
      if (enhancedData && (enhancedData.photos.length > 0 || enhancedData.reviews.length > 0)) {
        await updateSavedRecsWithEnhancement(restaurant.id, enhancedData)
        successCount++
        console.log(`   ✅ Success: ${enhancedData.photos.length} photos, ${enhancedData.reviews.length} reviews`)
      } else {
        failureCount++
        console.log(`   ❌ No data found or failed`)
      }

      // Delay between requests to respect rate limits (Google allows ~10 QPS)
      if (i < uniqueRestaurants.length - 1) {
        console.log(`   ⏳ Waiting 200ms...`)
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }

    console.log('\n🎉 Batch enhancement complete!')
    console.log(`📊 Results: ${successCount} enhanced, ${failureCount} failed`)
    console.log(`\n💡 Run again later to enhance more restaurants if needed`)

  } catch (error) {
    console.error('❌ Enhancement failed:', error)
    process.exit(1)
  }
}

// Run the script
main() 