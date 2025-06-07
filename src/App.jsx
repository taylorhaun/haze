import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import Auth from './components/Auth'
import RestaurantApp from './components/RestaurantApp'
import './App.css'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div className="app">
      {!session ? (
        <Auth supabase={supabase} />
      ) : (
        <RestaurantApp session={session} supabase={supabase} />
      )}
    </div>
  )
}

export default App 