
import { recordActivity } from './mockActivityApi'

import type { ChatJob, SubmitChatInput } from '../types/chat'
import { getDocuments } from './mockDocumentApi'

const STORAGE_PREFIX = 'llm-context-chat-'

function storageKey(workspaceId: string): string {
  return `${STORAGE_PREFIX}${workspaceId}`
}

function readJobs(workspaceId: string): ChatJob[] {
  const stored = localStorage.getItem(storageKey(workspaceId))

  return stored ? JSON.parse(stored) as ChatJob[] : []
}

function saveJobs(workspaceId: string, jobs: ChatJob[]): void {
  localStorage.setItem(storageKey(workspaceId), JSON.stringify(jobs))
}

// Mock jobs finish based on elapsed time.
// No background worker or LLM is running.
function updateMockStatus(job: ChatJob): ChatJob {
  if (job.status === 'completed' || job.status === 'failed') {
    return job
  }

  const elapsed = Date.now() - new Date(job.createdAt).getTime()

  if (elapsed < 700) {
    return { ...job, status: 'pending' }
  }

  if (elapsed < 2200) {
    return { ...job, status: 'processing' }
  }

  const selectedFiles = job.documentNames.length > 0
    ? job.documentNames.join(', ')
    : 'None'

  return {
    ...job,
    status: 'completed',
    answer:
      `This is a mock AI response to your question:\n\n` +
      `"${job.question}"\n\n` +
      `Selected documents: ${selectedFiles}\n\n` +
      `This response is only for testing the chat interface. ` +
      `No uploaded document contents were analyzed, ` +
      `and no real LLM was contacted.`,
  }
}


// Retrieve conversation history for one workspace.
export async function getChatHistory(
  workspaceId: string
): Promise<ChatJob[]> {
  const jobs = readJobs(workspaceId)
  const updated = jobs.map(updateMockStatus)

  if (JSON.stringify(updated) !== JSON.stringify(jobs)) {
    saveJobs(workspaceId, updated)

    // Only record jobs that have just reached completed status.
    updated.forEach((job, index) => {
      if (
        jobs[index].status !== 'completed' &&
        job.status === 'completed'
      ) {
        recordActivity({
          workspaceId,
          type: 'ai_completed',
          description: `Completed AI query: "${job.question.slice(0, 100)}"`,
        })
      }
    })
  }

  return updated
}


// Simulate submitting an asynchronous LLM query.
export async function submitChatQuery(
  input: SubmitChatInput
): Promise<ChatJob> {
  const question = input.question.trim()

  if (!question) {
    throw new Error('Please enter a question.')
  }

  if (question.length > 2000) {
    throw new Error('Questions must be 2000 characters or fewer.')
  }

  if (input.documentIds.length === 0) {
    throw new Error('Select at least one document.')
  }

  const documents = await getDocuments(input.workspaceId)

  const selectedDocuments = input.documentIds.map((id) => {
    const file = documents.find((document) => document.id === id)

    if (!file) {
      throw new Error('A selected document was not found.')
    }

    if (file.status !== 'completed') {
      throw new Error(`${file.name} is not ready for AI queries.`)
    }

    return file
  })

  const job: ChatJob = {
    id: crypto.randomUUID(),
    workspaceId: input.workspaceId,
    question,
    documentIds: input.documentIds,
    documentNames: selectedDocuments.map((file) => file.name),
    status: 'pending',
    answer: null,
    createdAt: new Date().toISOString(),
  }

  const jobs = readJobs(input.workspaceId)
  saveJobs(input.workspaceId, [...jobs, job])

  return job
}
