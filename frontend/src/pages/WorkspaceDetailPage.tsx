
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getWorkspaceById } from '../api/mockWorkspaceApi'
import type { Workspace } from '../types/workspace'
import './WorkspaceDetailPage.css'

function WorkspaceDetailPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!workspaceId) {
      return
    }

    let active = true

    getWorkspaceById(workspaceId).then((result) => {
      if (active) {
        setWorkspace(result)
        setLoading(false)
      }
    })

    return () => {
      active = false
    }
  }, [workspaceId])

  if (loading) {
    return <p>Loading workspace...</p>
  }

  if (!workspace) {
    return (
      <div>
        <h2>Workspace not found</h2>
        <Link to="/workspaces">← Back to Workspaces</Link>
      </div>
    )
  }

  return (
    <div className="workspace-detail">
      <Link to="/workspaces" className="back-link">
        ← Back to Workspaces
      </Link>

      <div className="workspace-detail-header">
        <div>
          <span className="workspace-eyebrow">YOUR WORKSPACE</span>
          <h1>{workspace.name}</h1>
          <p>
            {workspace.description || 'No description provided.'}
          </p>
        </div>

        <span className="detail-role-badge">
          {workspace.role}
        </span>
      </div>

      <div className="workspace-sections">
        

        <Link
          to={`/workspaces/${workspace.id}/documents`}
          className="workspace-section-card workspace-section-link"
        >
          <div className="section-icon">📄</div>
          <h3>Documents</h3>
          <p>Upload and manage your project files.</p>
          <span>Open Documents →</span>
        </Link>

        
        <Link
          to={`/workspaces/${workspace.id}/members`}
          className="workspace-section-card workspace-section-link"
        >
          <div className="section-icon">👥</div>
          <h3>Members</h3>
          <p>Collaborate with your workspace team.</p>
          <span>Manage Members →</span>
        </Link>

        
        <Link
          to={`/workspaces/${workspace.id}/chat`}
          className="workspace-section-card workspace-section-link"
        >
          <div className="section-icon">✦</div>
          <h3>AI Chat</h3>
          <p>Ask questions using your workspace documents.</p>
          <span>Open AI Chat →</span>
        </Link>


        <Link
          to={`/workspaces/${workspace.id}/activity`}
          className="workspace-section-card workspace-section-link"
        >
          <div className="section-icon">🕒</div>
          <h3>Activity Timeline</h3>
          <p>Review recent changes and completed AI interactions.</p>
          <span>View Activity →</span>
        </Link>


      </div>

      <div className="workspace-info">
        <h3>Workspace Information</h3>
        <p>
          <strong>Workspace ID:</strong> {workspace.id}
        </p>
        <p>
          <strong>Created:</strong>{' '}
          {new Date(workspace.createdAt).toLocaleDateString()}
        </p>
        <p>
          <strong>Your Role:</strong> {workspace.role}
        </p>
      </div>
    </div>
  )
}

export default WorkspaceDetailPage
