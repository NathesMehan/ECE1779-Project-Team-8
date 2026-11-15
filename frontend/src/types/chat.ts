
import type { ProcessingStatus } from './document'

export interface ChatJob {
  id: string
  workspaceId: string
  question: string
  documentIds: string[]
  documentNames: string[]
  status: ProcessingStatus
  answer: string | null
  createdAt: string
}

export interface SubmitChatInput {
  workspaceId: string
  question: string
  documentIds: string[]
}
