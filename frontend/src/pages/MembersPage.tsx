
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  getMembers,
  addMember,
  removeMember,
} from '../api/mockMemberApi'
import { getWorkspaceById } from '../api/mockWorkspaceApi'
import type { WorkspaceMember } from '../types/member'
import type { Workspace } from '../types/workspace'
import Button from '../components/Button'
import './MembersPage.css'

function MembersPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>()

  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const isOwner = workspace?.role === 'owner'

  useEffect(() => {
    if (!workspaceId) {
      setLoading(false)
      return
    }

    let active = true

    async function load() {
      try {
        const result = await getWorkspaceById(workspaceId!)

        if (!active) return

        setWorkspace(result)

        if (result) {
          const memberList = await getMembers(workspaceId!)
          if (active) setMembers(memberList)
        }
      } catch {
        if (active) setError('Unable to load workspace members.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [workspaceId])

  async function handleAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!workspaceId || !isOwner || saving) return

    setError('')
    setNotice('')
    setSaving(true)

    try {
      const newMember = await addMember(workspaceId, { name, email })

      setMembers((previous) => [...previous, newMember])
      setName('')
      setEmail('')
      setShowForm(false)
      setNotice('Member added to the mock workspace.')
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Unable to add member.'
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleRemoveMember(member: WorkspaceMember) {
    if (!workspaceId || !isOwner || saving) return

    const confirmed = window.confirm(
      `Remove ${member.email} from this workspace?`
    )

    if (!confirmed) return

    setError('')
    setNotice('')
    setSaving(true)

    try {
      await removeMember(workspaceId, member.id)

      setMembers((previous) =>
        previous.filter((item) => item.id !== member.id)
      )

      setNotice('Member removed successfully.')
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Unable to remove member.'
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p>Loading workspace members...</p>

  if (!workspace) {
    return (
      <div>
        <h2>Workspace not found</h2>
        <Link to="/workspaces">← Back to Workspaces</Link>
      </div>
    )
  }

  return (
    <div className="members-page">
      <Link
        to={`/workspaces/${workspaceId}`}
        className="members-back"
      >
        ← Back to Workspace
      </Link>

      <div className="members-header">
        <div>
          <span className="members-eyebrow">{workspace.name}</span>
          <h1>Team Members</h1>
          <p>
            Manage your workspace members and collaboration permissions.
          </p>
        </div>

        {isOwner && (
          <Button onClick={() => setShowForm((current) => !current)}>
            + Add Member
          </Button>
        )}
      </div>

      <div className="members-summary">
        <div className="members-summary-icon">👥</div>
        <div>
          <strong>{members.length} Team Member(s)</strong>
          <p>
            {isOwner
              ? 'You have owner permissions for this workspace.'
              : 'You have member access to this workspace.'}
          </p>
        </div>
      </div>

      {showForm && isOwner && (       
        
        
        <form className="member-form" onSubmit={handleAddMember}>
        <h2>Add a Team Member</h2>
        <p>
            Add a member by name and email. This is a mock membership record;
            no invitation will be sent.
        </p>

        {/* Full Name field */}
        <label htmlFor="member-name">Display Name (Nickname)</label>
        <input
            id="member-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. John Smith"
            required
            maxLength={100}
            style={{ marginBottom: '18px' }}
        />

        {/* Email Address field */}
        <label htmlFor="member-email">Email Address</label>
        <input
            id="member-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="teammate@example.com"
            required
            maxLength={254}
        />


          <div className="member-form-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={saving}>
              {saving ? 'Adding...' : 'Add Member'}
            </Button>
          </div>
        </form>
      )}

      {error && (
        <div className="members-message error" role="alert">
          {error}
        </div>
      )}

      {notice && (
        <div className="members-message success" role="status">
          {notice}
        </div>
      )}

      <div className="members-list-header">
        <h2>Workspace Members</h2>
        <span>{members.length} total</span>
      </div>

      <div className="members-list">
        {members.map((member) => (
          <div className="member-card" key={member.id}>
            <div className="member-avatar">
              {member.name.charAt(0).toUpperCase()}
            </div>

            <div className="member-info">
              <h3>{member.name}</h3>
              <p>{member.email}</p>
              <span>
                Joined {new Date(member.joinedAt).toLocaleDateString()}
              </span>
            </div>

            <div className="member-controls">
              <span className={`member-role ${member.role}`}>
                {member.role}
              </span>

              {isOwner && member.role !== 'owner' && (
                <button
                  className="remove-member-button"
                  onClick={() => handleRemoveMember(member)}
                  disabled={saving}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="member-permissions">
        <h3>Workspace Permissions</h3>
        <p>
          <strong>Owner:</strong> Can manage workspace members,
          documents, and workspace settings.
        </p>
        <p>
          <strong>Member:</strong> Can collaborate using workspace
          documents and AI features.
        </p>
        <small>
          Permissions are simulated in this frontend. The backend
          will enforce access control when integrated.
        </small>
      </div>
    </div>
  )
}

export default MembersPage
