
export type ActivityType =
  | 'workspace_created'
  | 'document_uploaded'
  | 'document_deleted'
  | 'member_added'
  | 'member_removed'
  | 'ai_completed'

export interface WorkspaceActivity {
  id: string
  workspaceId: string
  type: ActivityType
  description: string
  createdAt: string
}

export type CreateActivityInput = Pick<
  WorkspaceActivity,
  'workspaceId' | 'type' | 'description'
>
