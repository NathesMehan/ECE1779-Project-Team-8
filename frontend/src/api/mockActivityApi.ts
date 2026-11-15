
import type {
  WorkspaceActivity,
  CreateActivityInput,
} from '../types/activity'

const STORAGE_KEY = 'llm-context-activities'
export const ACTIVITY_UPDATED_EVENT = 'workspace-activity-updated'

// Read the stored activity records.
function readActivities(): WorkspaceActivity[] {
  const stored = localStorage.getItem(STORAGE_KEY)

  return stored ? JSON.parse(stored) as WorkspaceActivity[] : []
}

// Record an activity after a successful operation.
export function recordActivity(
  input: CreateActivityInput
): WorkspaceActivity {
  const activity: WorkspaceActivity = {
    id: crypto.randomUUID(),
    workspaceId: input.workspaceId,
    type: input.type,
    description: input.description,
    createdAt: new Date().toISOString(),
  }

  const activities = readActivities()

  activities.push(activity)

  // Limit mock history to the 500 newest events.
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(activities.slice(-500))
  )

  // Notify the current browser tab that history changed.
  window.dispatchEvent(new Event(ACTIVITY_UPDATED_EVENT))

  return activity
}

// Retrieve activities, optionally filtering by workspace.
export async function getActivities(
  workspaceId?: string
): Promise<WorkspaceActivity[]> {
  const activities = readActivities()

  return activities
    .filter((activity) =>
      workspaceId ? activity.workspaceId === workspaceId : true
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
