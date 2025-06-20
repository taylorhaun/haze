import React, { useState, useEffect } from 'react'

export default function CollaborativeLists({ session, supabase, onClose }) {
  const [lists, setLists] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedList, setSelectedList] = useState(null)
  const [friends, setFriends] = useState([])

  useEffect(() => {
    fetchLists()
    fetchFriends()
  }, [])

  const fetchLists = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get lists where user is owner or collaborator
      const { data, error } = await supabase
        .from('collaborative_lists')
        .select(`
          *,
          owner:profiles!collaborative_lists_owner_id_fkey(display_name, username),
          collaborators:list_collaborators(
            profiles(display_name, username)
          ),
          _count:list_places(count)
        `)
        .or(`owner_id.eq.${user.id},id.in.(select list_id from list_collaborators where user_id.eq.${user.id})`)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      console.log('📋 Collaborative lists:', data)
      setLists(data || [])
    } catch (error) {
      console.error('Error fetching lists:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchFriends = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get accepted friendships where user is either requester or addressee
      const { data: acceptedFriendships, error } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id, created_at')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)

      if (error) throw error

      if (!acceptedFriendships?.length) {
        setFriends([])
        return
      }

      // Extract friend IDs (the other person in each friendship)
      const friendIds = acceptedFriendships.map(friendship => 
        friendship.requester_id === user.id 
          ? friendship.addressee_id 
          : friendship.requester_id
      )

      // Get friend profiles
      const { data: friendProfiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, display_name, bio, avatar_url')
        .in('id', friendIds)

      if (profileError) throw profileError

      // Convert to friends list
      const friendsList = acceptedFriendships.map(friendship => ({
        friend_id: friendship.requester_id === user.id 
          ? friendship.addressee_id 
          : friendship.requester_id,
        profiles: friendProfiles.find(p => p.id === (
          friendship.requester_id === user.id 
            ? friendship.addressee_id 
            : friendship.requester_id
        ))
      }))

      setFriends(friendsList || [])
    } catch (error) {
      console.error('Error fetching friends:', error)
    }
  }

  const CreateListModal = ({ onClose, onCreateList }) => {
    const [listName, setListName] = useState('')
    const [description, setDescription] = useState('')
    const [selectedCollaborators, setSelectedCollaborators] = useState([])
    const [creating, setCreating] = useState(false)

    const toggleCollaborator = (friendId) => {
      setSelectedCollaborators(prev => 
        prev.includes(friendId)
          ? prev.filter(id => id !== friendId)
          : [...prev, friendId]
      )
    }

    const handleSubmit = async () => {
      if (!listName.trim()) return

      setCreating(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        // Create the list
        const { data: newList, error: listError } = await supabase
          .from('collaborative_lists')
          .insert({
            name: listName.trim(),
            description: description.trim() || null,
            owner_id: user.id
          })
          .select()
          .single()

        if (listError) throw listError

        // Add collaborators
        if (selectedCollaborators.length > 0) {
          const collaboratorInserts = selectedCollaborators.map(friendId => ({
            list_id: newList.id,
            user_id: friendId,
            role: 'collaborator'
          }))

          const { error: collaboratorError } = await supabase
            .from('list_collaborators')
            .insert(collaboratorInserts)

          if (collaboratorError) throw collaboratorError
        }

        await onCreateList()
        onClose()
      } catch (error) {
        console.error('Error creating list:', error)
        alert('Failed to create list: ' + error.message)
      } finally {
        setCreating(false)
      }
    }

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal create-list-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Create Collaborative List</h3>
            <button className="close-button" onClick={onClose}>×</button>
          </div>

          <div className="form-section">
            <label>List Name *</label>
            <input
              type="text"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="e.g., Date Night Spots, Weekend Brunch..."
              maxLength={100}
            />
          </div>

          <div className="form-section">
            <label>Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this list for?"
              rows={3}
              maxLength={300}
            />
          </div>

          {friends.length > 0 && (
            <div className="form-section">
              <label>Add Collaborators</label>
              <p className="section-subtitle">Friends who can add places to this list</p>
              <div className="collaborators-list">
                {friends.map(friend => (
                  <div 
                    key={friend.friend_id}
                    className={`collaborator-item ${selectedCollaborators.includes(friend.friend_id) ? 'selected' : ''}`}
                    onClick={() => toggleCollaborator(friend.friend_id)}
                  >
                    <div className="collaborator-info">
                      <div className="collaborator-name">{friend.profiles.display_name}</div>
                      <div className="collaborator-username">@{friend.profiles.username}</div>
                    </div>
                    <div className="collaborator-checkbox">
                      {selectedCollaborators.includes(friend.friend_id) ? '✓' : '○'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button 
              className="action-button secondary" 
              onClick={onClose}
              disabled={creating}
            >
              Cancel
            </button>
            <button 
              className="action-button primary" 
              onClick={handleSubmit}
              disabled={!listName.trim() || creating}
            >
              {creating ? 'Creating...' : 'Create List'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="collaborative-lists">
        <div className="header">
          <button className="back-button" onClick={onClose}>← Back</button>
          <h2>Loading...</h2>
        </div>
        <div className="loading-state">
          <div className="loading-spinner">🔄</div>
          <p>Loading your collaborative lists...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="collaborative-lists">
        <div className="header">
          <button className="back-button" onClick={onClose}>← Back</button>
          <div className="header-info">
            <h2>Collaborative Lists</h2>
            <p className="subtitle">Shared restaurant lists with friends</p>
          </div>
          <button className="create-button" onClick={() => setShowCreateModal(true)}>
            + Create
          </button>
        </div>

        {lists.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <h3>No collaborative lists yet</h3>
            <p>Create shared lists to discover places together with friends!</p>
            <button className="action-button primary" onClick={() => setShowCreateModal(true)}>
              Create Your First List
            </button>
          </div>
        ) : (
          <div className="lists-grid">
            {lists.map(list => (
              <div
                key={list.id}
                className="list-card"
                onClick={() => setSelectedList(list)}
              >
                <div className="list-header">
                  <h3 className="list-name">{list.name}</h3>
                  <div className="list-stats">
                    {/* TODO: Show actual place count */}
                    <span className="place-count">0 places</span>
                  </div>
                </div>
                
                {list.description && (
                  <p className="list-description">{list.description}</p>
                )}

                <div className="list-footer">
                  <div className="list-owner">
                    by {list.owner.display_name}
                  </div>
                  <div className="collaborator-count">
                    {/* TODO: Show collaborator count */}
                    {list.collaborators?.length > 0 ? 
                      `${list.collaborators.length} collaborator${list.collaborators.length !== 1 ? 's' : ''}` 
                      : 'Solo list'
                    }
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateListModal
          onClose={() => setShowCreateModal(false)}
          onCreateList={fetchLists}
        />
      )}

      <style>{`
        .collaborative-lists {
          padding: 20px;
          max-width: 600px;
          margin: 0 auto;
          min-height: 100vh;
          padding-bottom: 100px;
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          gap: 16px;
        }

        .back-button {
          background: #F2F2F7;
          color: #007AFF;
          border: none;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .back-button:hover {
          background: #E5E5EA;
        }

        .header-info {
          flex: 1;
        }

        .header-info h2 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          color: #1C1C1E;
        }

        .subtitle {
          margin: 4px 0 0 0;
          color: #8E8E93;
          font-size: 14px;
        }

        .create-button {
          background: #34C759;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .create-button:hover {
          background: #28A745;
        }

        .loading-state, .empty-state {
          text-align: center;
          padding: 60px 20px;
        }

        .loading-spinner, .empty-icon {
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
          color: #8E8E93;
          line-height: 1.5;
        }

        .lists-grid {
          display: grid;
          gap: 16px;
        }

        .list-card {
          background: white;
          border: 1px solid #E5E5EA;
          border-radius: 12px;
          padding: 20px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .list-card:hover {
          border-color: #007AFF;
          box-shadow: 0 2px 8px rgba(0, 122, 255, 0.1);
        }

        .list-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .list-name {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #1C1C1E;
          flex: 1;
        }

        .list-stats {
          color: #8E8E93;
          font-size: 14px;
        }

        .list-description {
          margin: 0 0 16px 0;
          color: #3C3C43;
          line-height: 1.5;
          font-size: 14px;
        }

        .list-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          color: #8E8E93;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1001;
          padding: 20px;
        }

        .modal {
          background: white;
          border-radius: 12px;
          width: 100%;
          max-width: 500px;
          max-height: 80vh;
          overflow-y: auto;
        }

        .create-list-modal {
          padding: 24px;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid #E5E5EA;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          color: #1C1C1E;
        }

        .close-button {
          background: none;
          border: none;
          font-size: 24px;
          color: #8E8E93;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .form-section {
          margin-bottom: 20px;
        }

        .form-section label {
          display: block;
          font-weight: 600;
          margin-bottom: 8px;
          color: #1C1C1E;
        }

        .section-subtitle {
          margin: 4px 0 12px 0;
          font-size: 14px;
          color: #8E8E93;
        }

        .form-section input,
        .form-section textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid #E5E5EA;
          border-radius: 8px;
          font-family: inherit;
          font-size: 16px;
          outline: none;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }

        .form-section input:focus,
        .form-section textarea:focus {
          border-color: #007AFF;
        }

        .collaborators-list {
          max-height: 200px;
          overflow-y: auto;
        }

        .collaborator-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          border: 2px solid #F2F2F7;
          border-radius: 8px;
          margin-bottom: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .collaborator-item:hover {
          border-color: #E5E5EA;
          background: #F9F9F9;
        }

        .collaborator-item.selected {
          border-color: #007AFF;
          background: #F0F8FF;
        }

        .collaborator-info {
          display: flex;
          flex-direction: column;
        }

        .collaborator-name {
          font-weight: 600;
          color: #1C1C1E;
        }

        .collaborator-username {
          font-size: 14px;
          color: #8E8E93;
        }

        .collaborator-checkbox {
          font-size: 20px;
          color: #007AFF;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid #E5E5EA;
        }

        .action-button {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          font-size: 16px;
          transition: all 0.2s;
        }

        .action-button.primary {
          background: #007AFF;
          color: white;
        }

        .action-button.primary:hover {
          background: #0056CC;
        }

        .action-button.primary:disabled {
          background: #8E8E93;
          cursor: not-allowed;
        }

        .action-button.secondary {
          background: #F2F2F7;
          color: #007AFF;
        }

        .action-button.secondary:hover {
          background: #E5E5EA;
        }
      `}</style>
    </>
  )
} 