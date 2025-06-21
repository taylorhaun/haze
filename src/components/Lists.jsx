import React, { useState, useEffect } from 'react'

export default function Lists({ session, supabase, onClose }) {
  const [lists, setLists] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    fetchLists()
  }, [])

  const fetchLists = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('lists')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setLists(data || [])
    } catch (error) {
      console.error('Error fetching lists:', error)
    } finally {
      setLoading(false)
    }
  }

  const CreateListModal = () => {
    const [listName, setListName] = useState('')
    const [description, setDescription] = useState('')
    const [isCollaborative, setIsCollaborative] = useState(false)
    const [creating, setCreating] = useState(false)

    const handleSubmit = async (e) => {
      e.preventDefault()
      if (!listName.trim()) return

      setCreating(true)
      try {
        console.log('Session:', session)
        console.log('User ID:', session?.user?.id)
        
        if (!session?.user?.id) {
          throw new Error('No user session found. Please try logging in again.')
        }
        
        const { data, error } = await supabase
          .from('lists')
          .insert([
            {
              name: listName.trim(),
              description: description.trim() || null,
              is_public: isCollaborative,
              owner_id: session?.user?.id
            }
          ])
          .select()

        if (error) throw error

        console.log('List created successfully:', data[0])
        setShowCreateModal(false)
        
        // Reset form
        setListName('')
        setDescription('')
        setIsCollaborative(false)
        
        // Refresh lists
        fetchLists()
      } catch (error) {
        console.error('Error creating list:', error)
        console.error('Full error details:', error.message, error.details, error.hint)
        alert(`Failed to create list: ${error.message}`)
      } finally {
        setCreating(false)
      }
    }

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 5000,
        padding: '20px'
      }} onClick={() => setShowCreateModal(false)}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '400px',
          width: '100%',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
        }} onClick={(e) => e.stopPropagation()}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: '700',
              color: '#1C1C1E'
            }}>Create New List</h3>
            <button 
              onClick={() => setShowCreateModal(false)}
              style={{
                background: '#F2F2F7',
                color: '#007AFF',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '16px',
                fontWeight: '600',
                color: '#1C1C1E'
              }}>List Name *</label>
              <input
                type="text"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                placeholder="e.g., Date Night Spots, Weekend Brunch..."
                maxLength={100}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #E5E5EA',
                  borderRadius: '12px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#007AFF'}
                onBlur={(e) => e.target.style.borderColor = '#E5E5EA'}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '16px',
                fontWeight: '600',
                color: '#1C1C1E'
              }}>Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this list for?"
                rows={3}
                maxLength={300}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #E5E5EA',
                  borderRadius: '12px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
                onFocus={(e) => e.target.style.borderColor = '#007AFF'}
                onBlur={(e) => e.target.style.borderColor = '#E5E5EA'}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                marginBottom: '8px'
              }}>
                <input
                  type="checkbox"
                  checked={isCollaborative}
                  onChange={(e) => setIsCollaborative(e.target.checked)}
                  style={{ margin: 0 }}
                />
                <span style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#1C1C1E'
                }}>
                  👥 Make this a collaborative list
                </span>
              </label>
              <p style={{
                margin: '0',
                fontSize: '14px',
                color: '#8E8E93',
                lineHeight: 1.4,
                paddingLeft: '24px'
              }}>
                {isCollaborative 
                  ? 'Friends can add places to this list' 
                  : 'Only you can add places to this list'
                }
              </p>
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button 
                type="button"
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
                style={{
                  background: '#F2F2F7',
                  color: '#8E8E93',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: creating ? 'not-allowed' : 'pointer',
                  opacity: creating ? 0.5 : 1
                }}
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={!listName.trim() || creating}
                style={{
                  background: (!listName.trim() || creating) ? '#8E8E93' : '#007AFF',
                  color: 'white',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: (!listName.trim() || creating) ? 'not-allowed' : 'pointer'
                }}
              >
                {creating ? 'Creating...' : 'Create List'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="lists-view">
        <div className="header">
          <button className="back-button" onClick={onClose}>← Back</button>
          <h2>Loading...</h2>
        </div>
        <div className="loading-state">
          <div className="loading-spinner">🔄</div>
          <p>Loading your lists...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="lists-view">
      <div className="header">
        <button className="back-button" onClick={onClose}>← Back</button>
        <div className="header-info">
          <h2>My Lists</h2>
          <p className="subtitle">Organize your favorite places</p>
        </div>
      </div>

      {lists.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <h3>No lists yet</h3>
          <p>Create lists to organize your favorite places!</p>
          <button 
            className="primary-button" 
            onClick={() => setShowCreateModal(true)}
          >
            Create Your First List
          </button>
        </div>
      ) : (
        <div className="lists-grid">
          {lists.map(list => (
            <div key={list.id} className="list-card">
              <div className="list-header">
                <h3 className="list-name">{list.name}</h3>
                <div className="list-type">
                  {list.is_public ? '👥' : '🔒'}
                </div>
              </div>
              {list.description && (
                <p className="list-description">{list.description}</p>
              )}
              <div className="list-footer">
                <span className="place-count">{list.place_count || 0} places</span>
                <span className="list-privacy">
                  {list.is_public ? 'Collaborative' : 'Private'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && <CreateListModal />}

      <style>{`
        .lists-view {
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

        .primary-button {
          background: #007AFF;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .primary-button:hover {
          background: #0056CC;
        }

        .lists-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .list-card {
          background: white;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          cursor: pointer;
          transition: all 0.2s;
        }

        .list-card:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          transform: translateY(-1px);
        }

        .list-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
        }

        .list-name {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #1C1C1E;
          flex: 1;
        }

        .list-type {
          font-size: 16px;
          margin-left: 12px;
        }

        .list-description {
          margin: 0 0 12px 0;
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

        .place-count {
          font-weight: 500;
        }

        .list-privacy {
          font-weight: 500;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: white;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          height: 100vh;
          height: 100dvh; /* Use dynamic viewport height for mobile */
        }

        .modal {
          background: white;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #E5E5EA;
          flex-shrink: 0;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          color: #1C1C1E;
        }

        .close-button {
          background: #F2F2F7;
          border: none;
          font-size: 16px;
          color: #007AFF;
          cursor: pointer;
          padding: 8px 12px;
          border-radius: 8px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .close-button:hover {
          background: #E5E5EA;
        }

        .create-form {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        .form-content {
          padding: 20px;
          flex: 1;
          padding-bottom: 120px; /* Space for sticky buttons */
        }

        .form-field {
          margin-bottom: 20px;
        }

        .form-field label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #1C1C1E;
          font-size: 16px;
        }

        .form-field input, .form-field textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #D1D1D6;
          border-radius: 8px;
          font-size: 16px;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }

        .form-field input:focus, .form-field textarea:focus {
          outline: none;
          border-color: #007AFF;
        }

        .checkbox-label {
          display: flex !important;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          margin-bottom: 8px !important;
        }

        .checkbox-label input[type="checkbox"] {
          width: auto !important;
          margin: 0;
        }

        .checkbox-text {
          font-size: 16px;
          color: #1C1C1E;
        }

        .field-hint {
          margin: 0;
          font-size: 14px;
          color: #8E8E93;
          line-height: 1.4;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          padding: 20px;
          border-top: 1px solid #E5E5EA;
          background: white;
          position: fixed;
          bottom: 40px;
          left: 0;
          right: 0;
          z-index: 1001;
          flex-shrink: 0;
        }

        .cancel-button {
          flex: 1;
          background: #F2F2F7;
          color: #007AFF;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .cancel-button:hover {
          background: #E5E5EA;
        }

        .create-button {
          flex: 1;
          background: #007AFF;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .create-button:hover {
          background: #0056CC;
        }

        .create-button:disabled, .cancel-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  )
} 