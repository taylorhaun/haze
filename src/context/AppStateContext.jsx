import React, { createContext, useContext, useReducer } from 'react'

// Action types
const ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_RESTAURANTS: 'SET_RESTAURANTS',
  SET_FILTERED_RESTAURANTS: 'SET_FILTERED_RESTAURANTS',
  SET_USER_PROFILE: 'SET_USER_PROFILE',
  SET_ACTIVE_TAB: 'SET_ACTIVE_TAB',
  ADD_RESTAURANT: 'ADD_RESTAURANT',
  UPDATE_RESTAURANT: 'UPDATE_RESTAURANT',
  DELETE_RESTAURANT: 'DELETE_RESTAURANT'
}

// Initial state
const initialState = {
  loading: true,
  error: null,
  restaurants: [],
  filteredRestaurants: [],
  userProfile: null,
  activeTab: 'map'
}

// Reducer
function appStateReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload }
    
    case ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, loading: false }
    
    case ACTIONS.SET_RESTAURANTS:
      return { 
        ...state, 
        restaurants: action.payload,
        filteredRestaurants: action.payload,
        loading: false 
      }
    
    case ACTIONS.SET_FILTERED_RESTAURANTS:
      return { ...state, filteredRestaurants: action.payload }
    
    case ACTIONS.SET_USER_PROFILE:
      return { ...state, userProfile: action.payload }
    
    case ACTIONS.SET_ACTIVE_TAB:
      return { ...state, activeTab: action.payload }
    
    case ACTIONS.ADD_RESTAURANT:
      const newRestaurants = [action.payload, ...state.restaurants]
      return {
        ...state,
        restaurants: newRestaurants,
        filteredRestaurants: newRestaurants
      }
    
    case ACTIONS.UPDATE_RESTAURANT:
      const updatedRestaurants = state.restaurants.map(rec => 
        rec.id === action.payload.id ? action.payload : rec
      )
      const updatedFiltered = state.filteredRestaurants.map(rec => 
        rec.id === action.payload.id ? action.payload : rec
      )
      return {
        ...state,
        restaurants: updatedRestaurants,
        filteredRestaurants: updatedFiltered
      }
    
    case ACTIONS.DELETE_RESTAURANT:
      const filteredRestaurants = state.restaurants.filter(rec => rec.id !== action.payload)
      const filteredFilteredRestaurants = state.filteredRestaurants.filter(rec => rec.id !== action.payload)
      return {
        ...state,
        restaurants: filteredRestaurants,
        filteredRestaurants: filteredFilteredRestaurants
      }
    
    default:
      return state
  }
}

// Context
const AppStateContext = createContext()

// Provider component
export function AppStateProvider({ children }) {
  const [state, dispatch] = useReducer(appStateReducer, initialState)

  // Action creators
  const actions = {
    setLoading: (loading) => dispatch({ type: ACTIONS.SET_LOADING, payload: loading }),
    setError: (error) => dispatch({ type: ACTIONS.SET_ERROR, payload: error }),
    setRestaurants: (restaurants) => dispatch({ type: ACTIONS.SET_RESTAURANTS, payload: restaurants }),
    setFilteredRestaurants: (restaurants) => dispatch({ type: ACTIONS.SET_FILTERED_RESTAURANTS, payload: restaurants }),
    setUserProfile: (profile) => dispatch({ type: ACTIONS.SET_USER_PROFILE, payload: profile }),
    setActiveTab: (tab) => dispatch({ type: ACTIONS.SET_ACTIVE_TAB, payload: tab }),
    addRestaurant: (restaurant) => dispatch({ type: ACTIONS.ADD_RESTAURANT, payload: restaurant }),
    updateRestaurant: (restaurant) => dispatch({ type: ACTIONS.UPDATE_RESTAURANT, payload: restaurant }),
    deleteRestaurant: (restaurantId) => dispatch({ type: ACTIONS.DELETE_RESTAURANT, payload: restaurantId })
  }

  const value = {
    ...state,
    ...actions
  }

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  )
}

// Hook to use the context
export function useAppState() {
  const context = useContext(AppStateContext)
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider')
  }
  return context
} 