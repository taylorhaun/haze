import React from 'react'
import Lists from '../Lists'

export default function ListsTab({ session, supabase }) {
  return (
    <Lists
      session={session}
      supabase={supabase}
      standalone={true}
    />
  )
} 