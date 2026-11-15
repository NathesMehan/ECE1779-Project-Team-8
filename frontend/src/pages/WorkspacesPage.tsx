
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../components/Button'
import CreateWorkspaceForm from '../components/CreateWorkspaceForm'
import { getWorkspaces, createWorkspace } from '../api/mockWorkspaceApi'
import type { Workspace } from '../types/workspace'
import './WorkspacesPage.css'

function WorkspacesPage() {
  const [showForm, setShowForm] = useState(false)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])

  useEffect(() => {
    getWorkspaces().then(setWorkspaces)
  }, [])

  async function handleCreateWorkspace(
    name: string,
    description: string
  ) {
    const newWorkspace = await createWorkspace({ name, description })

    setWorkspaces((previous) => [...previous, newWorkspace])
    setShowForm(false)
  }

  return (
    <div>
      <div className="workspace-header">
        <div>
          <h1>My Workspaces</h1>
          <p>
            Organize your projects, collaborate with your team,
            and manage your documents in one place.
          </p>
        </div>

        <Button onClick={() => setShowForm(!showForm)}>
          + Create Workspace
        </Button>
      </div>

      {showForm && (
        <div className="workspace-form-container">
          <CreateWorkspaceForm
            onCancel={() => setShowForm(false)}
            onCreate={handleCreateWorkspace}
          />
        </div>
      )}

      <div className="workspace-list">
        {workspaces.length === 0 ? (
          <div className="workspace-empty">
            <h3>No workspaces yet</h3>
            <p>Create your first workspace to get started!</p>
          </div>
        ) : (
          workspaces.map((workspace) => (
            <Link
              to={`/workspaces/${workspace.id}`}
              className="workspace-card"
              key={workspace.id}
            >
              <div className="workspace-card-icon">✦</div>

              <h3>{workspace.name}</h3>

              <p>
                {workspace.description || 'No description provided.'}
              </p>

              <div className="workspace-card-footer">
                <span className="role-badge">
                  {workspace.role}
                </span>
                <span className="workspace-open">Open →</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}

export default WorkspacesPage
