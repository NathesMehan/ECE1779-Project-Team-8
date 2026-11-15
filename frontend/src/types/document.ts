
export type ProcessingStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'

export interface WorkspaceDocument {
  id: string
  workspaceId: string
  name: string
  size: number
  type: string
  status: ProcessingStatus
  uploadedAt: string
}
