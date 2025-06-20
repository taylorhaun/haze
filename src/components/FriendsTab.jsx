import React, { useState, useEffect } from 'react'
import FriendPlacesView from './FriendPlacesView'

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
    <div className="section-tabs">
      <button
        className={`tab-button ${activeSection === 'friends' ? 'active' : ''}`}
        onClick={() => setActiveSection('friends')}
      >
        👥 Friends ({friends.length})
      </button>
      <button
        className={`tab-button ${activeSection === 'search' ? 'active' : ''}`}
        onClick={() => setActiveSection('search')}
      >
        🔍 Search
      </button>
      <button
        className={`tab-button ${activeSection === 'requests' ? 'active' : ''}`}
        onClick={() => setActiveSection('requests')}
      >
        📬 Requests {getRequestCount() > 0 && `(${getRequestCount()})`}
      </button>
    </div>
  )

  const renderFriendsList = () => (
    <div className="friends-list">
      {friends.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <h3>No friends yet</h3>
          <p>Search for friends to connect and share your favorite places!</p>
          <button
            className="primary-button"
            onClick={() => setActiveSection('search')}
          >
            Find Friends
          </button>
        </div>
      ) : (
        friends.map(friend => (
          <div key={friend.friend_id} className="friend-item">
            <div className="friend-avatar">
              {friend.profiles.avatar_url ? (
                <img src={friend.profiles.avatar_url} alt="" />
              ) : (
                <div className="avatar-placeholder">
                  {friend.profiles.display_name?.[0]?.toUpperCase() || '?'}
                </div>
              )}
            </div>
            <div className="friend-info">
              <div className="friend-name">{friend.profiles.display_name}</div>
              <div className="friend-username">@{friend.profiles.username}</div>
              {friend.profiles.bio && (
                <div className="friend-bio">{friend.profiles.bio}</div>
              )}
            </div>
            <div className="friend-actions">
              <button 
                className="secondary-button"
                onClick={() => {
                  setSelectedFriend(friend)
                  setShowFriendPlaces(true)
                }}
              >
                View Places
              </button>
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
              <div className="friend-username">@{user.username}</div>
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
                    <div className="friend-username">@{request.profiles.username}</div>
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
                <div className="friend-username">@{request.profiles.username}</div>
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
    <div className="friends-tab">
      <div className="friends-header">
        <h2>🤝 Friends</h2>
        <p>Connect with friends and discover their favorite places</p>
      </div>

      {renderSectionHeader()}
      {renderCurrentSection()}

      <style>{`
        .friends-tab {
          padding: 20px;
          max-width: 500px;
          margin: 0 auto;
          min-height: 100vh;
          padding-bottom: 100px;
        }

        .friends-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .friends-header h2 {
          margin: 0 0 8px 0;
          font-size: 28px;
          font-weight: 700;
          color: #1C1C1E;
        }

        .friends-header p {
          margin: 0;
          color: #8E8E93;
          font-size: 16px;
          line-height: 1.4;
        }

        .section-tabs {
          display: flex;
          background: #F2F2F7;
          border-radius: 12px;
          padding: 4px;
          margin-bottom: 24px;
        }

        .tab-button {
          flex: 1;
          background: transparent;
          border: none;
          padding: 12px 8px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          color: #8E8E93;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .tab-button.active {
          background: white;
          color: #007AFF;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .tab-button:hover:not(.active) {
          color: #007AFF;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #8E8E93;
        }

        .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .empty-state h3 {
          margin: 0 0 8px 0;
          font-size: 20px;
          font-weight: 600;
          color: #1C1C1E;
        }

        .empty-state p {
          margin: 0 0 24px 0;
          font-size: 16px;
          line-height: 1.4;
        }

        .friend-item, .search-result-item, .request-item {
          display: flex;
          align-items: center;
          padding: 16px;
          background: white;
          border-radius: 12px;
          margin-bottom: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .friend-avatar {
          width: 48px;
          height: 48px;
          border-radius: 24px;
          margin-right: 12px;
          overflow: hidden;
        }

        .friend-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-placeholder {
          width: 100%;
          height: 100%;
          background: #007AFF;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: 600;
        }

        .friend-info {
          flex: 1;
          min-width: 0;
        }

        .friend-name {
          font-size: 16px;
          font-weight: 600;
          color: #1C1C1E;
          margin-bottom: 2px;
        }

        .friend-username {
          font-size: 14px;
          color: #8E8E93;
          margin-bottom: 4px;
        }

        .relationship-status {
          font-size: 12px;
          font-weight: 500;
          margin-bottom: 4px;
        }

        .search-result-item .relationship-status {
          color: #34C759; /* Friends - green */
        }

        .search-result-item[data-status="incoming_request"] .relationship-status {
          color: #FF3B30; /* Incoming request - red */
        }

        .search-result-item[data-status="outgoing_request"] .relationship-status {
          color: #FF9500; /* Outgoing request - orange */
        }

        .friend-bio {
          font-size: 14px;
          color: #48484A;
          line-height: 1.3;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .request-status {
          font-size: 12px;
          color: #FF9500;
          font-weight: 500;
        }

        .friend-actions, .request-actions {
          display: flex;
          gap: 8px;
          margin-left: 12px;
        }

        .primary-button {
          background: #007AFF;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .primary-button:hover:not(:disabled) {
          background: #0056CC;
        }

        .primary-button:disabled {
          background: #C7C7CC;
          cursor: not-allowed;
        }

        .secondary-button {
          background: #F2F2F7;
          color: #007AFF;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .secondary-button:hover {
          background: #E5E5EA;
        }

        .search-input-container {
          position: relative;
          margin-bottom: 24px;
        }

        .search-input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #E5E5EA;
          border-radius: 12px;
          font-size: 16px;
          outline: none;
          transition: border-color 0.2s;
        }

        .search-input:focus {
          border-color: #007AFF;
        }

        .search-loading {
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: #8E8E93;
        }

        .search-hint, .no-results {
          text-align: center;
          padding: 40px 20px;
          color: #8E8E93;
          font-size: 16px;
        }

        .request-group {
          margin-bottom: 32px;
        }

        .request-group h3 {
          margin: 0 0 16px 0;
          font-size: 18px;
          font-weight: 600;
          color: #1C1C1E;
        }

        @media (max-width: 480px) {
          .friends-tab {
            padding: 16px;
          }

          .tab-button {
            font-size: 12px;
            padding: 10px 6px;
          }

          .friend-item, .search-result-item, .request-item {
            padding: 12px;
          }

          .friend-avatar {
            width: 40px;
            height: 40px;
            border-radius: 20px;
          }

          .avatar-placeholder {
            font-size: 16px;
          }

          .request-actions {
            flex-direction: column;
            gap: 4px;
          }

          .primary-button, .secondary-button {
            padding: 6px 12px;
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  )
} 