import React, { useState, useEffect } from 'react'

export default function SocialSetup({ session, supabase, onComplete }) {
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [usernameAvailable, setUsernameAvailable] = useState(null)
  const [checkingUsername, setCheckingUsername] = useState(false)

  // Pre-fill display name from user email
  useEffect(() => {
    if (session?.user?.email && !displayName) {
      const emailName = session.user.email.split('@')[0]
      setDisplayName(emailName.charAt(0).toUpperCase() + emailName.slice(1))
    }
  }, [session])

  // Check username availability as user types
  useEffect(() => {
    const checkUsername = async () => {
      if (!username || username.length < 3) {
        setUsernameAvailable(null)
        return
      }

      setCheckingUsername(true)
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', username.toLowerCase())
          .single()

        if (error && error.code === 'PGRST116') {
          // No rows found - username is available
          setUsernameAvailable(true)
        } else if (data) {
          // Username exists
          setUsernameAvailable(false)
        }
      } catch (err) {
        console.error('Error checking username:', err)
      } finally {
        setCheckingUsername(false)
      }
    }

    const debounceTimer = setTimeout(checkUsername, 500)
    return () => clearTimeout(debounceTimer)
  }, [username, supabase])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username || !displayName) return

    if (usernameAvailable === false) {
      setError('Username is not available')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Create or update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: session.user.id,
          username: username.toLowerCase(),
          display_name: displayName.trim(),
          bio: bio.trim() || null,
        })

      if (profileError) throw profileError

      console.log('✅ Social profile created successfully')
      if (onComplete) onComplete()
    } catch (err) {
      console.error('Error creating profile:', err)
      setError(err.message || 'Failed to create profile')
    } finally {
      setLoading(false)
    }
  }

  const validateUsername = (value) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9_]/g, '')
    setUsername(cleaned)
  }

  const getUsernameStatus = () => {
    if (!username || username.length < 3) {
      return { icon: '', text: 'Username must be at least 3 characters', color: '#8E8E93' }
    }
    if (checkingUsername) {
      return { icon: '⏳', text: 'Checking availability...', color: '#8E8E93' }
    }
    if (usernameAvailable === true) {
      return { icon: '✅', text: 'Username available!', color: '#34C759' }
    }
    if (usernameAvailable === false) {
      return { icon: '❌', text: 'Username taken', color: '#FF3B30' }
    }
    return { icon: '', text: '', color: '#8E8E93' }
  }

  const status = getUsernameStatus()

  return (
    <div className="social-setup">
      <div className="setup-container">
        {/* Header */}
        <div className="setup-header">
          <h2>🤝 Set Up Your Social Profile</h2>
          <p>Connect with friends and share your favorite places!</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="setup-form">
          {/* Username */}
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => validateUsername(e.target.value)}
              placeholder="your_username"
              maxLength={30}
              required
              className={`form-input ${usernameAvailable === false ? 'error' : ''}`}
            />
            {status.text && (
              <div className="input-status" style={{ color: status.color }}>
                {status.icon} {status.text}
              </div>
            )}
            <div className="input-hint">
              Letters, numbers, and underscores only. Others can find you with this username.
            </div>
          </div>

          {/* Display Name */}
          <div className="form-group">
            <label htmlFor="displayName">Display Name</label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your Name"
              maxLength={100}
              required
              className="form-input"
            />
            <div className="input-hint">
              This is how your name appears to friends.
            </div>
          </div>

          {/* Bio (Optional) */}
          <div className="form-group">
            <label htmlFor="bio">Bio (Optional)</label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell friends a bit about yourself..."
              maxLength={200}
              rows={3}
              className="form-textarea"
            />
            <div className="input-hint">
              {bio.length}/200 characters
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="error-message">
              ❌ {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !username || !displayName || usernameAvailable === false}
            className="submit-button"
          >
            {loading ? '⏳ Creating Profile...' : '🚀 Create Social Profile'}
          </button>

          {/* Skip Option */}
          <button
            type="button"
            onClick={() => onComplete && onComplete()}
            className="skip-button"
          >
            Skip for now
          </button>
        </form>
      </div>

      <style jsx>{`
        .social-setup {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .setup-container {
          background: white;
          border-radius: 16px;
          padding: 32px;
          width: 100%;
          max-width: 400px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .setup-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .setup-header h2 {
          margin: 0 0 8px 0;
          font-size: 24px;
          font-weight: 700;
          color: #1C1C1E;
        }

        .setup-header p {
          margin: 0;
          color: #8E8E93;
          font-size: 16px;
          line-height: 1.4;
        }

        .setup-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-weight: 600;
          color: #1C1C1E;
          font-size: 14px;
        }

        .form-input, .form-textarea {
          padding: 12px 16px;
          border: 2px solid #E5E5EA;
          border-radius: 8px;
          font-size: 16px;
          transition: border-color 0.2s;
          outline: none;
        }

        .form-input:focus, .form-textarea:focus {
          border-color: #007AFF;
        }

        .form-input.error {
          border-color: #FF3B30;
        }

        .form-textarea {
          resize: vertical;
          min-height: 80px;
          font-family: inherit;
        }

        .input-status {
          font-size: 14px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .input-hint {
          font-size: 12px;
          color: #8E8E93;
          line-height: 1.3;
        }

        .error-message {
          background: #FFE5E5;
          color: #FF3B30;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 14px;
          text-align: center;
        }

        .submit-button {
          background: #007AFF;
          color: white;
          border: none;
          padding: 16px 24px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .submit-button:hover:not(:disabled) {
          background: #0056CC;
          transform: translateY(-1px);
        }

        .submit-button:disabled {
          background: #C7C7CC;
          cursor: not-allowed;
          transform: none;
        }

        .skip-button {
          background: transparent;
          color: #8E8E93;
          border: none;
          padding: 12px;
          font-size: 14px;
          cursor: pointer;
          text-decoration: underline;
        }

        .skip-button:hover {
          color: #007AFF;
        }

        @media (max-width: 480px) {
          .social-setup {
            padding: 16px;
          }

          .setup-container {
            padding: 24px;
          }

          .setup-header h2 {
            font-size: 20px;
          }
        }
      `}</style>
    </div>
  )
} 