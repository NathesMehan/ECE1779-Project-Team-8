
export type WorkspaceRole = 'owner' | 'member'

export interface Workspace {
  id: string
  name: string
  description: string
  role: WorkspaceRole
  createdAt: string
}

export interface CreateWorkspaceInput {
  name: string
  description: string
}
