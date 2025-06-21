import React, { useState, useEffect } from 'react'
import FriendPlacesView from './FriendPlacesView'
import Container from './ui/Layout/Container'
import PageHeader from './ui/Layout/PageHeader'
import Button from './ui/Button'
import EmptyState from './ui/EmptyState'
import LoadingSpinner from './ui/LoadingSpinner'
import { colors, spacing, typography, borderRadius, commonStyles } from '../styles/tokens'

export default function FriendsTab({ session, supabase, userProfile }) {
  const [activeSection, setActiveSection] = useState('friends') // 'friends', 'search', 'requests'
  const [friends, setFriends] = useState([])
  const [friendRequests, setFriendRequests] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [selectedFriend, setSelectedFriend] = useState(null)
  const [showFriendPlaces, setShowFriendPlaces] = useState(false)


  useEffect(() => {
    console.log('🔍 FriendsTab mounted, fetching data...')
    fetchFriends()
    fetchFriendRequests()
  }, [])

  const fetchFriends = async () => {
    try {
      // Get accepted friendships where user is either requester or addressee
      const { data: acceptedFriendships, error } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id, created_at')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${session.user.id},addressee_id.eq.${session.user.id}`)

      if (error) throw error

      if (!acceptedFriendships?.length) {
        setFriends([])
        return
      }

      // Extract friend IDs (the other person in each friendship)
      const friendIds = acceptedFriendships.map(friendship => 
        friendship.requester_id === session.user.id 
          ? friendship.addressee_id 
          : friendship.requester_id
      )

      // Get friend profiles
      const { data: friendProfiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, display_name, bio, avatar_url')
        .in('id', friendIds)

      if (profileError) throw profileError

      // Combine friendship data with profiles
      const friendsWithProfiles = acceptedFriendships.map(friendship => ({
        friend_id: friendship.requester_id === session.user.id 
          ? friendship.addressee_id 
          : friendship.requester_id,
        friendship_date: friendship.created_at,
        profiles: friendProfiles.find(p => p.id === (
          friendship.requester_id === session.user.id 
            ? friendship.addressee_id 
            : friendship.requester_id
        ))
      }))

      setFriends(friendsWithProfiles || [])
    } catch (err) {
      console.error('Error fetching friends:', err)
    }
  }

  const fetchFriendRequests = async () => {
    try {
      // Get incoming requests with manual join
      const { data: incomingRequests, error: incomingError } = await supabase
        .from('friendships')
        .select('id, requester_id, created_at')
        .eq('addressee_id', session.user.id)
        .eq('status', 'pending')

      if (incomingError) throw incomingError

      // Get profiles for incoming requests
      let incomingWithProfiles = []
      if (incomingRequests?.length > 0) {
        const requesterIds = incomingRequests.map(req => req.requester_id)
        console.log('🔍 Getting profiles for requester IDs:', requesterIds)
        
        const { data: requesterProfiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, display_name, bio, avatar_url')
          .in('id', requesterIds)

        console.log('🔍 Got requester profiles:', requesterProfiles)

        if (profileError) {
          console.error('❌ Profile error:', profileError)
          throw profileError
        }

        incomingWithProfiles = incomingRequests.map(req => {
          const profile = requesterProfiles.find(p => p.id === req.requester_id)
          console.log(`🔍 Mapping request ${req.id} with profile:`, profile)
          return {
            ...req,
            profiles: profile
          }
        })
        
        console.log('🔍 Final incoming with profiles:', incomingWithProfiles)
      }

      // Get outgoing requests with manual join
      const { data: outgoingRequests, error: outgoingError } = await supabase
        .from('friendships')
        .select('id, addressee_id, created_at')
        .eq('requester_id', session.user.id)
        .eq('status', 'pending')

      if (outgoingError) throw outgoingError

      // Get profiles for outgoing requests
      let outgoingWithProfiles = []
      if (outgoingRequests?.length > 0) {
        const addresseeIds = outgoingRequests.map(req => req.addressee_id)
        const { data: addresseeProfiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, display_name, bio, avatar_url')
          .in('id', addresseeIds)

        if (profileError) throw profileError

        outgoingWithProfiles = outgoingRequests.map(req => ({
          ...req,
          profiles: addresseeProfiles.find(p => p.id === req.addressee_id)
        }))
      }

      setFriendRequests({
        incoming: incomingWithProfiles || [],
        outgoing: outgoingWithProfiles || []
      })
    } catch (err) {
      console.error('Error fetching friend requests:', err)
    }
  }

  const searchUsers = async (query) => {
    console.log('🔍 searchUsers called with query:', query)
    
    if (!query || query.length < 2) {
      console.log('🔍 Query too short, clearing results')
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      console.log('🔍 Searching for users...')
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, bio, avatar_url')
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .neq('id', session.user.id) // Don't include self
        .limit(20)

      if (error) throw error

      console.log('🔍 Raw search results:', data)

      // Determine relationship status for each user
      const friendIds = new Set(friends.map(f => f.friend_id))
      const incomingRequestIds = new Set(friendRequests.incoming?.map(r => r.requester_id) || [])
      const outgoingRequestIds = new Set(friendRequests.outgoing?.map(r => r.addressee_id) || [])

      const usersWithStatus = data.map(user => {
        let status = 'none' // default: can send friend request
        let statusText = ''
        let actionButton = 'Add Friend'
        let canSendRequest = true

        if (friendIds.has(user.id)) {
          status = 'friend'
          statusText = '✅ Friends'
          actionButton = 'View Places'
          canSendRequest = false
        } else if (incomingRequestIds.has(user.id)) {
          status = 'incoming_request'
          statusText = '📨 Sent you a request'
          actionButton = 'View Request'
          canSendRequest = false
        } else if (outgoingRequestIds.has(user.id)) {
          status = 'outgoing_request'
          statusText = '⏳ Request sent'
          actionButton = 'Pending'
          canSendRequest = false
        }

        return {
          ...user,
          relationshipStatus: status,
          statusText,
          actionButton,
          canSendRequest
        }
      })

      console.log('🔍 Users with status:', usersWithStatus)
      setSearchResults(usersWithStatus)
    } catch (err) {
      console.error('Error searching users:', err)
    } finally {
      setSearching(false)
    }
  }

  const sendFriendRequest = async (userId) => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('friendships')
        .insert([{
          requester_id: session.user.id,
          addressee_id: userId,
          status: 'pending'
        }])

      if (error) throw error

      // Update the search results to reflect the new status
      setSearchResults(prev => prev.map(user => 
        user.id === userId 
          ? {
              ...user,
              relationshipStatus: 'outgoing_request',
              statusText: '⏳ Request sent',
              actionButton: 'Pending',
              canSendRequest: false
            }
          : user
      ))
      
      // Refresh requests to update the requests tab
      fetchFriendRequests()
    } catch (err) {
      console.error('Error sending friend request:', err)
      alert('Failed to send friend request')
    } finally {
      setLoading(false)
    }
  }

  const respondToFriendRequest = async (requestId, action) => {
    setLoading(true)
    try {
      if (action === 'accept') {
        const { error } = await supabase
          .from('friendships')
          .update({ status: 'accepted' })
          .eq('id', requestId)

        if (error) throw error
      } else if (action === 'decline') {
        const { error } = await supabase
          .from('friendships')
          .delete()
          .eq('id', requestId)

        if (error) throw error
      }

      // Refresh both friends and requests
      fetchFriends()
      fetchFriendRequests()
    } catch (err) {
      console.error('Error responding to friend request:', err)
      alert(`Failed to ${action} friend request`)
    } finally {
      setLoading(false)
    }
  }

  const handleSearchChange = (value) => {
    setSearchQuery(value)
    // Clear any existing debounce timer
    if (window.searchDebounceTimer) {
      clearTimeout(window.searchDebounceTimer)
    }
    // Set new debounce timer
    window.searchDebounceTimer = setTimeout(() => searchUsers(value), 500)
  }

  const getRequestCount = () => {
    return friendRequests.incoming?.length || 0
  }

  const renderSectionHeader = () => (
    <div style={{
      display: 'flex',
      background: colors.background.secondary,
      borderRadius: borderRadius.md,
      padding: spacing.xs,
      marginBottom: spacing.xxl,
    }}>
      <button
        style={{
          flex: 1,
          background: activeSection === 'friends' ? colors.background.primary : 'transparent',
          border: 'none',
          padding: `${spacing.md} ${spacing.sm}`,
          borderRadius: borderRadius.sm,
          fontSize: typography.size.xs,
          fontWeight: typography.weight.medium,
          color: activeSection === 'friends' ? colors.primary : colors.text.secondary,
          cursor: 'pointer',
          transition: 'all 0.2s',
          boxShadow: activeSection === 'friends' ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        onClick={() => setActiveSection('friends')}
      >
        Friends ({friends.length})
      </button>
      <button
        style={{
          flex: 1,
          background: activeSection === 'search' ? colors.background.primary : 'transparent',
          border: 'none',
          padding: `${spacing.md} ${spacing.sm}`,
          borderRadius: borderRadius.sm,
          fontSize: typography.size.xs,
          fontWeight: typography.weight.medium,
          color: activeSection === 'search' ? colors.primary : colors.text.secondary,
          cursor: 'pointer',
          transition: 'all 0.2s',
          boxShadow: activeSection === 'search' ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        onClick={() => setActiveSection('search')}
      >
        Search
      </button>
      <button
        style={{
          flex: 1,
          background: activeSection === 'requests' ? colors.background.primary : 'transparent',
          border: 'none',
          padding: `${spacing.md} ${spacing.sm}`,
          borderRadius: borderRadius.sm,
          fontSize: typography.size.xs,
          fontWeight: typography.weight.medium,
          color: activeSection === 'requests' ? colors.primary : colors.text.secondary,
          cursor: 'pointer',
          transition: 'all 0.2s',
          boxShadow: activeSection === 'requests' ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        onClick={() => setActiveSection('requests')}
      >
        Requests {getRequestCount() > 0 && `(${getRequestCount()})`}
      </button>
    </div>
  )

  const renderFriendsList = () => (
    <div>
      {friends.length === 0 ? (
        <EmptyState
          icon="👥"
          title="No friends yet"
          description="Search for friends to connect and share your favorite places!"
          actionLabel="Find Friends"
          onAction={() => setActiveSection('search')}
        />
      ) : (
        friends.map(friend => (
          <div key={friend.friend_id} style={{
            display: 'flex',
            alignItems: 'center',
            padding: spacing.md,
            background: colors.background.primary,
            borderRadius: borderRadius.md,
            marginBottom: spacing.sm,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '20px',
              marginRight: spacing.md,
              overflow: 'hidden',
            }}>
              {friend.profiles.avatar_url ? (
                <img 
                  src={friend.profiles.avatar_url} 
                  alt="" 
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <div style={{
                  width: '100%',
                  height: '100%',
                  background: colors.primary,
                  color: colors.background.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: typography.size.lg,
                  fontWeight: typography.weight.semibold,
                }}>
                  {friend.profiles.display_name?.[0]?.toUpperCase() || '?'}
                </div>
              )}
            </div>
            <div style={{
              flex: 1,
              minWidth: 0,
            }}>
              <div style={{
                fontSize: typography.size.base,
                fontWeight: typography.weight.semibold,
                color: colors.text.primary,
                marginBottom: spacing.xs,
              }}>
                {friend.profiles.display_name}
              </div>
              {friend.profiles.bio && (
                <div style={{
                  fontSize: typography.size.sm,
                  color: colors.text.secondary,
                  lineHeight: typography.lineHeight.normal,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}>
                  {friend.profiles.bio}
                </div>
              )}
            </div>
            <div style={{
              marginLeft: spacing.md,
            }}>
              <Button 
                variant="primary"
                size="small"
                onClick={() => {
                  setSelectedFriend(friend)
                  setShowFriendPlaces(true)
                }}
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                View Places
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  )

  const renderSearch = () => (
    <div className="search-section">
      <div className="search-input-container">
        <input
          type="text"
          placeholder="Search by username or name..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="search-input"
        />
        {searching && <div className="search-loading">🔍</div>}
      </div>

      <div className="search-results">
        {searchQuery.length < 2 && (
          <div className="search-hint">
            Type at least 2 characters to search for friends
          </div>
        )}

        {searchQuery.length >= 2 && searchResults.length === 0 && !searching && (
          <div className="no-results">
            No users found for "{searchQuery}"
          </div>
        )}

        {searchResults.map(user => (
          <div key={user.id} className="search-result-item" data-status={user.relationshipStatus}>
            <div className="friend-avatar">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" />
              ) : (
                <div className="avatar-placeholder">
                  {user.display_name?.[0]?.toUpperCase() || '?'}
                </div>
              )}
            </div>
            <div className="friend-info">
              <div className="friend-name">{user.display_name}</div>
              {user.statusText && (
                <div className="relationship-status">{user.statusText}</div>
              )}
              {user.bio && <div className="friend-bio">{user.bio}</div>}
            </div>
            <div className="friend-actions">
              {user.relationshipStatus === 'friend' && (
                <button 
                  className="secondary-button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedFriend({
                      friend_id: user.id,
                      profiles: {
                        display_name: user.display_name,
                        username: user.username,
                        bio: user.bio,
                        avatar_url: user.avatar_url
                      }
                    })
                    setShowFriendPlaces(true)
                  }}
                >
                  View Places
                </button>
              )}
              {user.relationshipStatus === 'incoming_request' && (
                <button
                  className="primary-button"
                  onClick={() => setActiveSection('requests')}
                >
                  View Request
                </button>
              )}
              {user.relationshipStatus === 'outgoing_request' && (
                <button className="secondary-button" disabled>
                  Pending
                </button>
              )}
              {user.canSendRequest && (
                <button
                  className="primary-button"
                  onClick={() => sendFriendRequest(user.id)}
                  disabled={loading}
                >
                  {loading ? '...' : 'Add Friend'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderRequests = () => {
    console.log('🔍 Rendering requests, friendRequests state:', friendRequests)
    
    return (
      <div className="requests-section">
        {/* Incoming Requests */}
        {friendRequests.incoming?.length > 0 && (
          <div className="request-group">
            <h3>Friend Requests</h3>
            {friendRequests.incoming.map(request => {
              console.log('🔍 Rendering request:', request)
              
              if (!request.profiles) {
                console.warn('⚠️ Request missing profiles:', request)
                return null
              }
              
              return (
                <div key={request.id} className="request-item">
                  <div className="friend-avatar">
                    {request.profiles.avatar_url ? (
                      <img src={request.profiles.avatar_url} alt="" />
                    ) : (
                      <div className="avatar-placeholder">
                        {request.profiles.display_name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                  <div className="friend-info">
                    <div className="friend-name">{request.profiles.display_name}</div>
                    {request.profiles.bio && (
                      <div className="friend-bio">{request.profiles.bio}</div>
                    )}
                  </div>
                  <div className="request-actions">
                    <button
                      className="primary-button"
                      onClick={() => respondToFriendRequest(request.id, 'accept')}
                      disabled={loading}
                    >
                      Accept
                    </button>
                    <button
                      className="secondary-button"
                      onClick={() => respondToFriendRequest(request.id, 'decline')}
                      disabled={loading}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      {/* Outgoing Requests */}
      {friendRequests.outgoing?.length > 0 && (
        <div className="request-group">
          <h3>Sent Requests</h3>
          {friendRequests.outgoing.map(request => (
            <div key={request.id} className="request-item">
              <div className="friend-avatar">
                {request.profiles.avatar_url ? (
                  <img src={request.profiles.avatar_url} alt="" />
                ) : (
                  <div className="avatar-placeholder">
                    {request.profiles.display_name?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
              </div>
              <div className="friend-info">
                <div className="friend-name">{request.profiles.display_name}</div>
                <div className="request-status">Request sent</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(!friendRequests.incoming?.length && !friendRequests.outgoing?.length) && (
        <div className="empty-state">
          <div className="empty-icon">📬</div>
          <h3>No friend requests</h3>
          <p>When you send or receive friend requests, they'll appear here.</p>
        </div>
      )}
    </div>
    )
  }

  const renderCurrentSection = () => {
    switch (activeSection) {
      case 'friends':
        return renderFriendsList()
      case 'search':
        return renderSearch()
      case 'requests':
        return renderRequests()
      default:
        return renderFriendsList()
    }
  }

  if (showFriendPlaces && selectedFriend) {
    return (
      <FriendPlacesView
        friend={selectedFriend}
        session={session}
        supabase={supabase}
        onClose={() => {
          setShowFriendPlaces(false)
          setSelectedFriend(null)
        }}
      />
    )
  }





  return (
    <Container padding="minimal">
      <PageHeader
        title="Friends"
        icon="🤝"
      />

      {renderSectionHeader()}
      {renderCurrentSection()}

    </Container>
  )
} 