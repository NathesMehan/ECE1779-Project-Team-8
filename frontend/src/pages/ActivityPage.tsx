
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  getActivities,
  ACTIVITY_UPDATED_EVENT,
} from '../api/mockActivityApi'
import {
  getWorkspaces,
  getWorkspaceById,
} from '../api/mockWorkspaceApi'
import type { WorkspaceActivity, ActivityType } from '../types/activity'
import type { Workspace } from '../types/workspace'
import './ActivityPage.css'

type ActivityFilter =
  | 'all'
  | 'documents'
  | 'members'
  | 'ai'
  | 'workspaces'

const filters: { label: string; value: ActivityFilter }[] = [
  { label: 'All Activity', value: 'all' },
  { label: 'Documents', value: 'documents' },
  { label: 'Members', value: 'members' },
  { label: 'AI Queries', value: 'ai' },
  { label: 'Workspaces', value: 'workspaces' },
]

const activityLabels: Record<ActivityType, string> = {
  workspace_created: 'Workspace Created',
  document_uploaded: 'Document Uploaded',
  document_deleted: 'Document Deleted',
  member_added: 'Member Added',
  member_removed: 'Member Removed',
  ai_completed: 'AI Query Completed',
}

const activityIcons: Record<ActivityType, string> = {
  workspace_created: '✦',
  document_uploaded: '📄',
  document_deleted: '🗑️',
  member_added: '👤',
  member_removed: '👥',
  ai_completed: '✨',
}

function matchesFilter(
  type: ActivityType,
  filter: ActivityFilter
): boolean {
  switch (filter) {
    case 'documents':
      return type.startsWith('document_')
    case 'members':
      return type.startsWith('member_')
    case 'ai':
      return type === 'ai_completed'
    case 'workspaces':
      return type === 'workspace_created'
    default:
      return true
  }
}

function ActivityPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>()

  const [activities, setActivities] = useState<WorkspaceActivity[]>([])
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null)
  const [filter, setFilter] = useState<ActivityFilter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    setLoading(true)
    setError('')
    setFilter('all')
    setCurrentWorkspace(null)

    async function load() {
      try {
        const [workspaceList, activityList] = await Promise.all([
          getWorkspaces(),
          getActivities(workspaceId),
        ])

        const workspace = workspaceId
          ? await getWorkspaceById(workspaceId)
          : null

        if (!active) return

        setWorkspaces(workspaceList)
        setActivities(activityList)
        setCurrentWorkspace(workspace)
      } catch {
        if (active) setError('Unable to load activity history.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()

    // Refresh whenever a mock activity is recorded.
    function refresh() {
      void getActivities(workspaceId)
        .then((result) => {
          if (active) setActivities(result)
        })
        .catch(() => {
          if (active) setError('Unable to refresh activity.')
        })
    }

    window.addEventListener(ACTIVITY_UPDATED_EVENT, refresh)
    window.addEventListener('storage', refresh)

    return () => {
      active = false
      window.removeEventListener(ACTIVITY_UPDATED_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [workspaceId])

  if (loading) {
    return <p>Loading activity timeline...</p>
  }

  if (workspaceId && !currentWorkspace) {
    return (
      <div>
        <h2>Workspace not found</h2>
        <Link to="/workspaces">← Back to Workspaces</Link>
      </div>
    )
  }

  const visibleActivities = activities.filter((activity) =>
    matchesFilter(activity.type, filter)
  )

  function workspaceName(id: string): string {
    return workspaces.find((item) => item.id === id)?.name ?? 'Workspace'
  }

  function formatDate(timestamp: string): string {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div className="activity-page">
      {workspaceId && (
        <Link
          to={`/workspaces/${workspaceId}`}
          className="activity-back"
        >
          ← Back to Workspace
        </Link>
      )}

      <div className="activity-page-header">
        <div>
          <span className="activity-eyebrow">
            {currentWorkspace?.name ?? 'ALL WORKSPACES'}
          </span>

          <h1>Activity Timeline</h1>

          <p>
            Track document changes, team collaboration,
            and completed AI interactions.
          </p>
        </div>

        <span className="activity-count">
          {activities.length} event(s)
        </span>
      </div>

      <div className="activity-summary">
        <div className="activity-summary-icon">↗</div>
        <div>
          <strong>Workspace Activity</strong>
          <p>
            Recent actions are recorded automatically
            as you work in your workspace.
          </p>
        </div>
      </div>

      {!workspaceId && workspaces.length > 0 && (
        <div className="activity-workspace-links">
          <strong>View a specific workspace:</strong>

          <div>
            {workspaces.map((workspace) => (
              <Link
                key={workspace.id}
                to={`/workspaces/${workspace.id}/activity`}
              >
                {workspace.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="activity-filter-bar">
        {filters.map((item) => (
          <button
            key={item.value}
            type="button"
            className={
              filter === item.value
                ? 'activity-filter active'
                : 'activity-filter'
            }
            onClick={() => setFilter(item.value)}
            aria-pressed={filter === item.value}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="activity-error" role="alert">
          {error}
        </div>
      )}

      {visibleActivities.length === 0 ? (
        <div className="activity-empty">
          <div className="activity-empty-icon">🕒</div>
          <h3>No activities to display</h3>
          <p>
            New workspace actions will appear here automatically.
            Existing actions from before activity tracking was
            enabled are not included.
          </p>
        </div>
      ) : (
        <div className="activity-timeline">
          {visibleActivities.map((activity) => (
            <div className="activity-item" key={activity.id}>
              <div className="activity-marker">
                {activityIcons[activity.type]}
              </div>

              <div className="activity-card">
                <div className="activity-card-top">
                  <h3>{activityLabels[activity.type]}</h3>
                  <time dateTime={activity.createdAt}>
                    {formatDate(activity.createdAt)}
                  </time>
                </div>

                <p>{activity.description}</p>

                <div className="activity-card-footer">
                  <span className="activity-workspace-badge">
                    {workspaceName(activity.workspaceId)}
                  </span>
                  <span className="activity-type-badge">
                    {activity.type.replaceAll('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ActivityPage
