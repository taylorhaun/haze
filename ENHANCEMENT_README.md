# Restaurant Enhancement Script

This script enhances older restaurants that have `source_data: null` by fetching photos and reviews from Google Places API.

## Problem it Solves

- **Older restaurants** have `source_data: null` (no photos/reviews)
- **Newer restaurants** have rich `source_data` with photos/reviews  
- **Top Saved view** only shows photos for newer restaurants
- **Map view** works because it uses user's own saved records

## Prerequisites

1. **Environment Variables** - Add to your `.env` file:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. **Service Role Key** - Get this from Supabase Dashboard:
   - Go to Supabase Dashboard → Settings → API
   - Copy the `service_role` key (NOT the anon key)
   - Add it to your `.env` file as `SUPABASE_SERVICE_ROLE_KEY`

## Running the Script

```bash
# Install dependencies (if not already done)
npm install

# Run the enhancement script
npm run enhance-restaurants
```

## What the Script Does

1. **Finds restaurants** with `saved_recs` that have `source_data: null`
2. **Searches Google Places** for each restaurant by name + address
3. **Fetches photos & reviews** (up to 3 of each)
4. **Updates all null `saved_recs`** for that restaurant with enhanced data
5. **Processes in batches** (5 at a time) to respect API rate limits
6. **Limits to 50 restaurants** per run to manage costs

## Expected Output

```
🚀 Starting restaurant enhancement batch job...
📍 Initializing Google Maps...
✅ Google Maps initialized
🔍 Finding restaurants that need enhancement...
📊 Found 23 restaurants to enhance

🔄 Processing batch 1/5
🔍 Enhancing: Pizza Palace
✅ Enhanced Pizza Palace: 3 photos, 2 reviews
   ✅ Updated 4 saved_recs
🔍 Enhancing: Burger Joint
❌ Restaurant not found in Google Places: Burger Joint

🎉 Batch enhancement complete!
```

## Cost Management

- **Limited scope**: Only 50 restaurants per run
- **Batch processing**: 5 restaurants at a time with 2-second delays
- **One-time cost**: Run once or twice to enhance your database
- **Estimated cost**: ~$0.50-$2.00 for 50 restaurants (depending on Google Places pricing)

## Re-running the Script

- **Safe to re-run**: Only processes restaurants with `source_data: null`
- **Progressive enhancement**: Run multiple times to enhance more restaurants
- **Monitor results**: Check console output to see success rate

## After Running

1. **Test Top Saved view**: Photos should now appear for enhanced restaurants
2. **Check console logs**: Verify photos are loading with debug output
3. **Run again if needed**: Enhance more restaurants in batches

## Troubleshooting

- **"Google Maps API key not configured"**: Check your `.env` file
- **"Authentication failed"**: Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
- **"Restaurant not found"**: Some restaurants may not exist in Google Places
- **Rate limiting**: Script automatically handles this with delays 