
import type { WorkspaceRole } from './workspace'

export interface WorkspaceMember {
  id: string
  workspaceId: string
  name: string
  email: string
  role: WorkspaceRole
  joinedAt: string
}

export interface AddMemberInput {
  name: string
  email: string
}
