
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getWorkspaces, getWorkspaceById } from '../api/mockWorkspaceApi'
import { getDocuments } from '../api/mockDocumentApi'
import { getChatHistory, submitChatQuery } from '../api/mockChatApi'
import type { Workspace } from '../types/workspace'
import type { WorkspaceDocument } from '../types/document'
import type { ChatJob } from '../types/chat'
import Button from '../components/Button'
import './ChatPage.css'

function ChatPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>()

  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [documents, setDocuments] = useState<WorkspaceDocument[]>([])
  const [jobs, setJobs] = useState<ChatJob[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    setLoading(true)
    setError('')
    setSelectedIds([])
    setJobs([])
    setDocuments([])
    setWorkspace(null)

    async function load() {
      try {
        if (!workspaceId) {
          const list = await getWorkspaces()

          if (active) setWorkspaces(list)
          return
        }

        const [currentWorkspace, files, history] = await Promise.all([
          getWorkspaceById(workspaceId),
          getDocuments(workspaceId),
          getChatHistory(workspaceId),
        ])

        if (!active) return

        setWorkspace(currentWorkspace)
        setDocuments(files)
        setJobs(history)
      } catch {
        if (active) setError('Unable to load AI Chat.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [workspaceId])

  // Refresh mock job statuses while queries are unfinished.
  useEffect(() => {
    if (!workspaceId || !workspace) return

    const hasActiveJobs = jobs.some(
      (job) => job.status === 'pending' || job.status === 'processing'
    )

    if (!hasActiveJobs) return

    let active = true

    const interval = window.setInterval(async () => {
      try {
        const updated = await getChatHistory(workspaceId)

        if (active) setJobs(updated)
      } catch {
        if (active) setError('Unable to refresh chat status.')
      }
    }, 500)

    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [workspaceId, workspace, jobs])

  function toggleDocument(id: string) {
    setSelectedIds((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id]
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!workspaceId || submitting) return

    setError('')
    setSubmitting(true)

    try {
      const job = await submitChatQuery({
        workspaceId,
        question,
        documentIds: selectedIds,
      })

      setJobs((previous) => [...previous, job])
      setQuestion('')
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Unable to submit query.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <p>Loading AI Chat...</p>
  }

  // The sidebar's AI Chat link opens a workspace chooser.
  if (!workspaceId) {
    return (
      <div className="chat-page">
        <h1>AI Chat</h1>
        <p className="chat-subtitle">
          Choose a workspace to chat with its documents.
        </p>

        <div className="chat-workspace-picker">
          {workspaces.length === 0 ? (
            <div className="chat-empty">
              <h3>No workspaces available</h3>
              <p>Create a workspace before starting a conversation.</p>
              <Link to="/workspaces">Go to Workspaces →</Link>
            </div>
          ) : (
            workspaces.map((item) => (
              <Link
                key={item.id}
                to={`/workspaces/${item.id}/chat`}
                className="chat-workspace-option"
              >
                <span className="chat-workspace-icon">✦</span>
                <strong>{item.name}</strong>
                <span>Open Chat →</span>
              </Link>
            ))
          )}
        </div>
      </div>
    )
  }

  if (!workspace) {
    return (
      <div>
        <h2>Workspace not found</h2>
        <Link to="/workspaces">← Back to Workspaces</Link>
      </div>
    )
  }

  const readyDocuments = documents.filter(
    (file) => file.status === 'completed'
  )

  return (
    <div className="chat-page">
      <Link
        to={`/workspaces/${workspaceId}`}
        className="chat-back"
      >
        ← Back to Workspace
      </Link>

      <div className="chat-page-header">
        <span className="chat-eyebrow">{workspace.name}</span>
        <h1>AI Workspace Assistant</h1>
        <p>
          Ask questions about your selected workspace documents.
        </p>
      </div>

      <div className="chat-layout">
        <aside className="chat-documents-panel">
          <h2>Context Documents</h2>
          <p>Select files to include in your question.</p>

          {readyDocuments.length === 0 ? (
            <div className="chat-no-documents">
              <p>No completed documents available.</p>
              <Link to={`/workspaces/${workspaceId}/documents`}>
                Upload Documents →
              </Link>
            </div>
          ) : (
            <div className="chat-document-list">
              {readyDocuments.map((file) => (
                <label
                  className="chat-document-option"
                  key={file.id}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(file.id)}
                    onChange={() => toggleDocument(file.id)}
                  />
                  <span>📄 {file.name}</span>
                </label>
              ))}
            </div>
          )}

          <div className="chat-selection-summary">
            {selectedIds.length} document(s) selected
          </div>

          <Link
            to={`/workspaces/${workspaceId}/documents`}
            className="chat-manage-documents"
          >
            Manage Documents →
          </Link>
        </aside>

        <section className="chat-conversation">
          <div className="chat-conversation-heading">
            <div className="chat-assistant-avatar">✦</div>
            <div>
              <h2>Workspace Assistant</h2>
              <span>AI-powered document assistance</span>
            </div>
          </div>

          <div className="chat-messages" aria-live="polite">
            {jobs.length === 0 ? (
              <div className="chat-welcome">
                <div className="chat-welcome-icon">✦</div>
                <h3>What would you like to explore?</h3>
                <p>
                  Select one or more documents, then ask a question
                  about your project.
                </p>
                <div className="chat-example">
                  Try: "Summarize the main ideas in these documents."
                </div>
              </div>
            ) : (
              jobs.map((job) => (
                <div className="chat-exchange" key={job.id}>
                  <div className="chat-message user">
                    <div className="chat-bubble">
                      {job.question}
                    </div>
                    <small>You</small>
                  </div>

                  <div className="chat-message assistant">
                    <div className="chat-bubble">
                      {job.status === 'pending' && (
                        <p>⏳ Your question is queued...</p>
                      )}

                      {job.status === 'processing' && (
                        <p>✦ Processing your question...</p>
                      )}

                      {job.status === 'completed' && (
                        <p className="chat-answer">{job.answer}</p>
                      )}

                      {job.status === 'failed' && (
                        <p>Unable to process this question.</p>
                      )}

                      <div className="chat-job-details">
                        <span className={`chat-job-status ${job.status}`}>
                          {job.status}
                        </span>
                        <span>
                          {job.documentNames.length} document(s)
                        </span>
                      </div>
                    </div>
                    <small>Workspace Assistant · Mock</small>
                  </div>
                </div>
              ))
            )}
          </div>

          {error && (
            <div className="chat-error" role="alert">
              {error}
            </div>
          )}

          <form className="chat-input-area" onSubmit={handleSubmit}>
            <label htmlFor="chat-question" className="chat-input-label">
              Your question
            </label>

            <textarea
              id="chat-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask something about your documents..."
              rows={3}
              maxLength={2000}
              required
            />

            <div className="chat-input-footer">
              <span>
                {selectedIds.length} file(s) selected
              </span>

              <Button
                type="submit"
                disabled={
                  submitting ||
                  !question.trim() ||
                  selectedIds.length === 0
                }
              >
                {submitting ? 'Submitting...' : 'Send Message →'}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}

export default ChatPage
