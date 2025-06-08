# Instagram Sharing & AI Processing Feature Plan

## Overview
Build a feature that allows users to share Instagram Reels to the Haze app, which then uses AI to automatically extract restaurant information and create comprehensive restaurant records.

## User Flow
1. User sees Instagram Reel about a restaurant
2. Taps "Share" → selects "Haze" app  
3. Haze opens with loading screen: "🤖 Analyzing content..."
4. AI processes video + audio → extracts restaurant data → enhances with Google Places
5. User reviews/edits AI suggestions in preview screen
6. User adds location (if needed) and saves restaurant

## Technical Architecture

### Phase 1: PWA Setup & Sharing Infrastructure
**Goal:** Enable Instagram → Haze sharing capability

**Tasks:**
- [ ] Create PWA manifest (`manifest.json`)
- [ ] Add service worker for offline capability
- [ ] Implement Web Share Target API for receiving shared content
- [ ] Set up URL handling for shared Instagram content
- [ ] Test sharing from Instagram to PWA

**Files to Create/Modify:**
- `public/manifest.json`
- `public/sw.js` (service worker)
- `vite.config.js` (PWA configuration)
- Update `index.html` with manifest link

### Phase 2: AI Content Processing Engine
**Goal:** Extract restaurant data from Instagram Reels using AI

**AI Services Integration:**
- **GPT-4 Vision:** Analyze video frames for visual restaurant information
- **Whisper:** Transcribe full audio for spoken restaurant details
- **Custom prompts:** Extract structured restaurant data

**Data to Extract:**
- Restaurant name
- Cuisine type  
- Address/location clues
- Menu items mentioned
- Price indicators
- Ambiance/vibe description
- Operating hours (if mentioned)
- Special features (delivery, reservations, etc.)

**Tasks:**
- [ ] Set up OpenAI API integration
- [ ] Build video frame extraction utility
- [ ] Create audio transcription service
- [ ] Design AI prompts for restaurant data extraction
- [ ] Build confidence scoring system
- [ ] Create fallback handling for low-confidence results

**Files to Create:**
- `src/services/aiProcessor.js`
- `src/services/openaiClient.js`
- `src/utils/videoProcessor.js`
- `src/utils/audioExtractor.js`

### Phase 3: Google Places Integration
**Goal:** Enhance AI-extracted data with official restaurant information

**Integration Points:**
- Use extracted restaurant name + location for Places search
- Merge AI data with Places API data
- Resolve conflicts between data sources
- Fill gaps in AI extraction

**Data Enhancement:**
- Official address and coordinates
- Phone number and website
- Hours of operation
- Photos and reviews
- Price level verification
- Category confirmation

**Tasks:**
- [ ] Set up Google Places API integration
- [ ] Build restaurant matching algorithm
- [ ] Create data merging logic
- [ ] Handle ambiguous matches
- [ ] Implement fallback strategies

**Files to Create:**
- `src/services/googlePlaces.js`
- `src/utils/dataMatching.js`
- `src/utils/dataMerger.js`

### Phase 4: User Interface Components
**Goal:** Smooth user experience for reviewing and saving AI-processed restaurants

**Components Needed:**
1. **ShareReceiver** - Handles incoming shared content
2. **AIProcessor** - Loading screen during AI analysis
3. **RestaurantPreview** - Review/edit AI suggestions
4. **LocationPicker** - Add/verify location if needed
5. **ConfidenceIndicator** - Show AI confidence levels

**UI Flow:**
```
ShareReceiver → AIProcessor → RestaurantPreview → Save
```

**Tasks:**
- [ ] Build ShareReceiver component
- [ ] Create AIProcessor loading screen
- [ ] Design RestaurantPreview form
- [ ] Implement LocationPicker with maps
- [ ] Add confidence indicators and validation
- [ ] Handle error states and retries

**Files to Create:**
- `src/components/ShareReceiver.jsx`
- `src/components/AIProcessor.jsx`
- `src/components/RestaurantPreview.jsx`
- `src/components/LocationPicker.jsx`
- `src/components/ConfidenceIndicator.jsx`

### Phase 5: Database & Storage
**Goal:** Store shared content and processed results

**Database Additions:**
- `shared_content` table for incoming Instagram data
- `ai_processing_logs` for debugging and improvement
- Add `confidence_score` field to `saved_recs`
- Add `data_sources` field (instagram, ai, google_places)

**Storage Considerations:**
- Temporary video/audio file storage
- Processing status tracking
- Error logging and analytics

**Tasks:**
- [ ] Create database migrations
- [ ] Set up temporary file storage
- [ ] Implement processing queue system
- [ ] Add analytics and logging

## Technical Requirements

### Dependencies to Add
```bash
npm install openai googleapis multer ffmpeg-static
```

### Environment Variables Needed
```
OPENAI_API_KEY=your_openai_key
GOOGLE_PLACES_API_KEY=your_google_places_key
GOOGLE_CLOUD_STORAGE_BUCKET=temp_storage_bucket
```

### PWA Configuration
- Installable on iOS home screen
- Share target registration
- Offline capability
- Background sync for processing

## Success Metrics
- [ ] Users can successfully share Instagram Reels to Haze
- [ ] AI extracts restaurant name with >90% accuracy
- [ ] AI extracts location clues with >80% accuracy  
- [ ] Google Places matching works for >85% of restaurants
- [ ] End-to-end flow takes <30 seconds
- [ ] User satisfaction with AI suggestions >80%

## Potential Challenges & Solutions

**Challenge:** Instagram content access limitations
**Solution:** Work with publicly shared URLs and user-provided content

**Challenge:** AI processing costs
**Solution:** Start with simpler prompts, optimize based on usage

**Challenge:** Video processing complexity
**Solution:** Extract key frames rather than processing entire video

**Challenge:** Location ambiguity
**Solution:** Always require user confirmation for location

**Challenge:** Low AI confidence
**Solution:** Graceful degradation to manual entry with AI assistance

## Future Enhancements
- Support for Instagram Stories (not just Reels)
- Support for TikTok and other platforms
- Bulk processing of multiple shares
- AI learning from user corrections
- Community verification of AI suggestions
- Integration with other restaurant APIs (Yelp, etc.)

---

## Implementation Timeline
**Week 1:** PWA setup and sharing infrastructure
**Week 2:** AI processing engine and OpenAI integration  
**Week 3:** Google Places integration and data merging
**Week 4:** UI components and user experience
**Week 5:** Testing, refinement, and launch preparation 