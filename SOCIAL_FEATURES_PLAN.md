# 🚀 Haze v2 Social Features - Implementation Plan

## 📋 Phase 1: Core Social Foundation

### 🎯 **Goals**
- Enable mutual friendships between users
- Allow place sharing to specific friends
- Implement dual tag system (private/public)
- Create friend discovery mechanisms
- Set up privacy controls for individual places

---

## 🏗️ **Implementation Roadmap**

### **Step 1: Database Schema Migration** (Priority: HIGH)
- [ ] Run `social-schema-phase1.sql` to set up all tables
- [ ] Migrate existing tags from `saved_recs.tags` to new `place_tags` table
- [ ] Add social profile setup for existing users

### **Step 2: User Profile Enhancement** (Priority: HIGH)
- [ ] Add username selection during onboarding
- [ ] Create profile setup/edit screen
- [ ] Add social profile fields (display name, bio)
- [ ] Username validation and uniqueness checking

### **Step 3: Friend Discovery & Management** (Priority: HIGH)
- [ ] Friend search by username
- [ ] Send/accept/decline friend requests
- [ ] Friend request notifications
- [ ] Friends list view
- [ ] Block/unblock functionality

### **Step 4: Place Visibility Controls** (Priority: MEDIUM)
- [ ] Add visibility toggle to place detail view
- [ ] Show privacy indicator on place cards
- [ ] Batch privacy controls for multiple places
- [ ] Default new places to "friends" visibility

### **Step 5: Tag System Enhancement** (Priority: MEDIUM)
- [ ] Dual tag input (private vs public tags)
- [ ] Visual distinction between tag types
- [ ] Migration script for existing tags
- [ ] Tag filtering by type in search

### **Step 6: Place Sharing** (Priority: MEDIUM)
- [ ] Share button on place detail
- [ ] Friend selector for sharing
- [ ] Optional message with shares
- [ ] Shared places inbox/notifications
- [ ] Share tracking and analytics

---

## 🎨 **UI/UX Components to Build**

### **New Screens**
1. **Social Onboarding** - Username setup for new users
2. **Profile Setup/Edit** - Social profile management
3. **Friends List** - View and manage friendships
4. **Friend Search** - Find users by username/phone/email
5. **Friend Requests** - Manage incoming/outgoing requests
6. **Share Place Modal** - Select friends to share with
7. **Shared Places** - View places shared with you

### **Enhanced Existing Screens**
1. **RestaurantDetail** - Add share button and visibility controls
2. **ProfileTab** - Add social profile info and friend count
3. **SearchAndFilter** - Add public tag filtering for friend places
4. **RestaurantList** - Show privacy indicators

---

## 🔧 **Technical Implementation Details**

### **Frontend Architecture**
```javascript
// New social context for state management
const SocialContext = {
  friends: [],
  friendRequests: [],
  sharedPlaces: [],
  userProfile: {},
  // ... social state
}

// New API service layer
const SocialAPI = {
  sendFriendRequest(username),
  acceptFriendRequest(requestId),
  sharePlace(placeId, friendIds, message),
  searchUsers(query),
  updatePlaceVisibility(placeId, visibility),
  // ... social methods
}
```

### **Backend Functions (Supabase)**
```sql
-- Key functions to implement
- search_users(query)
- send_friend_request(requester_id, addressee_username)
- manage_friend_request(request_id, action)
- share_place(saved_rec_id, friend_ids, message)
- get_friend_places(user_id, friend_id)
- update_place_visibility(saved_rec_id, visibility)
```

---

## 🎯 **User Experience Flow**

### **New User Onboarding**
1. Email/password signup ✅ (existing)
2. **NEW**: Choose unique username
3. **NEW**: Set display name and optional bio
4. **NEW**: Import contacts or search friends (optional)
5. Add first place ✅ (existing)

### **Sharing a Place**
1. Open place detail ✅ (existing)
2. **NEW**: Tap share button
3. **NEW**: Select friends from list
4. **NEW**: Add optional message
5. **NEW**: Send share notification

### **Friend Discovery**
1. **NEW**: Search by username in friends tab
2. **NEW**: Send friend request
3. **NEW**: Recipient gets notification
4. **NEW**: Accept/decline request
5. **NEW**: Start seeing each other's places

---

## 🔒 **Privacy & Security Considerations**

### **Data Protection**
- Personal notes remain completely private (never shared)
- Users control individual place visibility
- Friend requests can be disabled per user
- Robust blocking system for harassment prevention

### **Supabase RLS Policies**
- Users only see friend-visible places from actual friends
- Place shares only visible to sender/recipient
- Friend requests only visible to involved parties
- All social data properly scoped by user authentication

---

## 📊 **Success Metrics**

### **Phase 1 KPIs**
- Friend connections made per user
- Places shared per week
- User retention with social features vs without
- Time spent browsing friend places
- Conversion rate: shared place → saved place

---

## 🚀 **Future Phases (Post Phase 1)**

### **Phase 2: Enhanced Discovery**
- Public lists creation and sharing
- Smart filtering ("Sarah's date night spots")
- Activity feed for friend actions
- Push notifications for social activity

### **Phase 3: Advanced Social**
- Follow model (non-mutual connections)
- Public profiles and place discovery
- Collaborative lists
- Social recommendations engine

### **Phase 4: Monetization**
- Premium social features
- Promoted places in friend feeds
- Business partnerships for social sharing
- Advanced analytics for power users

---

## ❓ **Open Questions for Decision**

1. **Username Requirements**: Length limits? Special characters allowed?
2. **Friend Limits**: Should there be a maximum number of friends?
3. **Share Limits**: Rate limiting on place shares to prevent spam?
4. **Profile Photos**: Do we want profile pictures in Phase 1?
5. **Public Tag Examples**: What are some good default public tags to suggest?

---

## 🎯 **Next Steps**

1. **Validate this plan** - Does this align with your vision?
2. **Prioritize features** - Which components should we build first?
3. **Design review** - Any UI/UX preferences for the social components?
4. **Technical decisions** - Any concerns about the database design?

This foundation will enable all your requested social features while keeping the implementation manageable and scalable! 🚀 