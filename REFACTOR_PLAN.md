# Haze App Refactor Plan

## Current Issues Identified

### 1. **Inconsistent Styling**
- 47+ hardcoded color values across components
- Repeated spacing values (20px, 16px, 12px etc.)
- Mix of inline styles and CSS classes
- No consistent design system

### 2. **Component Organization**
- All components in flat `/components` folder (12 components)
- Large files: Lists.jsx (1902 lines), MapView.jsx (846 lines), RestaurantApp.jsx (339 lines)
- Mixed concerns in single components
- Inconsistent naming patterns

### 3. **Data Fetching Patterns**
- Each component implements its own async/loading patterns
- Inconsistent error handling (alerts vs console.log)
- Repeated Supabase query logic across components

### 4. **State Management**
- Props drilling through multiple levels
- No centralized state management
- Inconsistent loading/error states

## Proposed New Structure

```
src/
├── components/
│   ├── ui/                    # Reusable UI components
│   │   ├── Button.jsx
│   │   ├── LoadingSpinner.jsx
│   │   ├── EmptyState.jsx
│   │   ├── Modal.jsx
│   │   ├── Input.jsx
│   │   └── Layout/
│   │       ├── Container.jsx
│   │       ├── PageHeader.jsx
│   │       └── BottomNavigation.jsx
│   │
│   ├── features/              # Feature-specific components
│   │   ├── auth/
│   │   │   ├── AuthForm.jsx
│   │   │   └── SocialSetup.jsx
│   │   │
│   │   ├── restaurants/
│   │   │   ├── RestaurantList.jsx
│   │   │   ├── RestaurantCard.jsx
│   │   │   ├── RestaurantDetail.jsx
│   │   │   ├── SearchAndFilter.jsx
│   │   │   └── InstagramImporter.jsx
│   │   │
│   │   ├── map/
│   │   │   ├── MapView.jsx
│   │   │   └── LocationControls.jsx
│   │   │
│   │   ├── social/
│   │   │   ├── FriendsList.jsx
│   │   │   ├── FriendPlacesView.jsx
│   │   │   ├── UserSearch.jsx
│   │   │   └── FriendRequests.jsx
│   │   │
│   │   ├── lists/
│   │   │   ├── ListsManager.jsx
│   │   │   ├── CreateListModal.jsx
│   │   │   └── ListDetail.jsx
│   │   │
│   │   └── profile/
│   │       └── ProfileSettings.jsx
│   │
│   └── pages/                 # Page-level components
│       ├── ListTab.jsx
│       ├── MapTab.jsx
│       ├── SearchTab.jsx
│       ├── FriendsTab.jsx
│       └── ProfileTab.jsx
│
├── hooks/                     # Custom React hooks
│   ├── useSupabase.js
│   ├── useAuth.js
│   ├── useLocalStorage.js
│   └── useDebounce.js
│
├── utils/                     # Utility functions
│   ├── supabaseHelpers.js
│   ├── formatters.js
│   ├── validators.js
│   └── constants.js
│
├── styles/                    # Styling system
│   ├── tokens.js              # Design tokens
│   ├── global.css             # Global styles
│   └── components.css         # Component-specific styles
│
├── context/                   # React Context providers
│   ├── AuthContext.jsx
│   ├── AppStateContext.jsx
│   └── SupabaseContext.jsx
│
└── types/                     # TypeScript definitions (future)
    ├── supabase.types.ts
    └── app.types.ts
```

## Migration Steps

### Phase 1: Foundation (Week 1)
1. ✅ Create design system (`/styles/tokens.js`)
2. ✅ Create reusable UI components (`Button`, `Container`, `PageHeader`)
3. ✅ Create custom hooks for data fetching
4. ✅ Create utility functions for Supabase operations
5. Create context providers for global state

### Phase 2: Component Refactoring (Week 2)
1. **Break down large components:**
   - Split `Lists.jsx` (1902 lines) into smaller focused components
   - Split `MapView.jsx` (846 lines) into map-specific components
   - Split `RestaurantApp.jsx` (339 lines) into page components

2. **Reorganize by feature:**
   - Move auth-related components to `/features/auth/`
   - Move restaurant components to `/features/restaurants/`
   - Move social features to `/features/social/`

3. **Replace inline styles:**
   - Update all components to use design tokens
   - Remove hardcoded colors and spacing
   - Implement consistent styling patterns

### Phase 3: Logic Consolidation (Week 3)
1. **Data fetching consistency:**
   - Replace component-level fetching with custom hooks
   - Implement consistent loading/error states
   - Use utility functions for Supabase operations

2. **State management:**
   - Implement context providers for shared state
   - Reduce props drilling
   - Centralize app-level state

### Phase 4: Testing & Optimization (Week 4)
1. Add error boundaries
2. Implement proper loading states
3. Add accessibility improvements
4. Performance optimizations
5. Mobile-specific enhancements

## Benefits After Refactor

### 1. **Maintainability**
- 🎨 Consistent design system with tokens
- 📁 Clear folder structure by feature
- 🔄 Reusable components reduce duplication
- 🎯 Single responsibility components

### 2. **Developer Experience**
- 🚀 Faster development with reusable components
- 🐛 Easier debugging with smaller components
- 📚 Better code discoverability
- 🔧 Consistent patterns across the app

### 3. **Performance**
- ⚡ Smaller component bundles
- 🎯 Better React optimization opportunities
- 📱 Improved mobile performance
- 🔄 Consistent loading states

### 4. **Scalability**
- ➕ Easy to add new features
- 🧩 Modular architecture
- 🔀 Easy to swap implementations
- 📈 Ready for team growth

## Quick Wins (Can implement immediately)

1. **Replace hardcoded colors** with design tokens
2. **Use Container component** for consistent layouts
3. **Use LoadingSpinner** for consistent loading states
4. **Use EmptyState** for no-data scenarios
5. **Use Button component** for consistent interactive elements

## Implementation Priority

### High Priority (Immediate)
- Design system integration
- Large component breakdown
- Consistent data fetching patterns

### Medium Priority (Next sprint)
- Folder restructuring
- Context providers
- Error handling improvements

### Low Priority (Future)
- TypeScript migration
- Advanced performance optimizations
- Accessibility enhancements

## Metrics to Track

- **Bundle size reduction**
- **Component reuse percentage**
- **Development velocity**
- **Bug reduction**
- **Mobile performance scores** 