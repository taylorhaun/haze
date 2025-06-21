import React from 'react'
import Lists from '../Lists'
import Container from '../ui/Layout/Container'
import PageHeader from '../ui/Layout/PageHeader'

export default function ListsTab({ session, supabase }) {
  return (
    <Container padding="minimal">
      <PageHeader
        title="Lists"
        icon="📝"
        subtitle="Collaborative collections of places"
      />
      
      <Lists
        session={session}
        supabase={supabase}
        standalone={true}
      />
    </Container>
  )
} 