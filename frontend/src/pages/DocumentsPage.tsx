
import { recordActivity } from '../api/mockActivityApi'

import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  getDocuments,
  uploadDocument,
  downloadDocument,
  deleteDocument,
} from '../api/mockDocumentApi'
import { getWorkspaceById } from '../api/mockWorkspaceApi'
import type { WorkspaceDocument } from '../types/document'
import './DocumentsPage.css'

function DocumentsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>()

  const [workspaceName, setWorkspaceName] = useState('')
  const [documents, setDocuments] = useState<WorkspaceDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  async function refreshDocuments(id: string) {
    const result = await getDocuments(id)
    setDocuments(result)
  }

  useEffect(() => {
    if (!workspaceId) {
      return
    }

    let active = true

    async function load() {
      try {
        const [workspace, files] = await Promise.all([
          getWorkspaceById(workspaceId!),
          getDocuments(workspaceId!),
        ])

        if (!active) return

        setWorkspaceName(workspace?.name || '')
        setDocuments(files)
      } catch {
        if (active) setError('Unable to load documents.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [workspaceId])

  async function handleUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(event.target.files || [])

    if (!workspaceId || files.length === 0) return

    setError('')
    setNotice('')
    setUploading(true)

    let successCount = 0
    const errors: string[] = []

    try {
      for (const file of files) {
        try {
          await uploadDocument(workspaceId, file)
          successCount++
        } catch (error) {
          errors.push(
            error instanceof Error ? error.message : 'Upload failed.'
          )
        }
      }

      await refreshDocuments(workspaceId)

      if (successCount > 0) {
        setNotice(
          `${successCount} file(s) uploaded successfully (mock storage).`
        )
      }

      if (errors.length > 0) {
        setError(errors.join(' '))
      }
    } catch {
      setError('Unable to refresh the document list.')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  async function handleDelete(documentId: string, name: string) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${name}"?`
    )

    if (!confirmed || !workspaceId) return

    try {
      setError('')
      setNotice('')
      

    await deleteDocument(documentId)

    recordActivity({
      workspaceId,
      type: 'document_deleted',
      description: `Deleted document "${name}"`,
    })

    await refreshDocuments(workspaceId)
    setNotice('Document deleted successfully.')
    

    } catch {
      setError('Unable to delete the document.')
    }
  }

  async function handleDownload(documentId: string) {
    try {
      setError('')
      await downloadDocument(documentId)
    } catch {
      setError('Unable to download the document.')
    }
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  if (loading) return <p>Loading documents...</p>

  if (!workspaceName) {
    return (
      <div>
        <h2>Workspace not found</h2>
        <Link to="/workspaces">← Back to Workspaces</Link>
      </div>
    )
  }

  return (
    <div className="documents-page">
      <Link
        to={`/workspaces/${workspaceId}`}
        className="documents-back"
      >
        ← Back to Workspace
      </Link>

      <div className="documents-header">
        <div>
          <span className="documents-eyebrow">
            {workspaceName}
          </span>
          <h1>Documents</h1>
          <p>
            Upload, organize, and manage your workspace files.
          </p>
        </div>

        <button
          className="documents-upload-button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'Uploading...' : '+ Upload Files'}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.py,.js,.jsx,.ts,.tsx,.json,.csv,.html,.css"
          onChange={handleUpload}
          style={{ display: 'none' }}
          aria-label="Choose files to upload"
        />
      </div>

      <div className="documents-upload-hint">
        <span>☁</span>
        <div>
          <strong>Your documents, one place.</strong>
          <p>
            PDF, Word, text, Markdown, images, and source code.
            Maximum 10 MB per file.
          </p>
        </div>
      </div>

      {error && (
        <div className="documents-message error" role="alert">
          {error}
        </div>
      )}

      {notice && (
        <div className="documents-message success" role="status">
          {notice}
        </div>
      )}

      <div className="documents-list-header">
        <h2>Files</h2>
        <span>{documents.length} document(s)</span>
      </div>

      {documents.length === 0 ? (
        <div className="documents-empty">
          <div className="documents-empty-icon">📂</div>
          <h3>No documents yet</h3>
          <p>
            Upload your first document to start building
            your workspace context.
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            Upload Your First File
          </button>
        </div>
      ) : (
        <div className="documents-table-wrapper">
          <table className="documents-table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Size</th>
                <th>Uploaded</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {documents.map((file) => (
                <tr key={file.id}>
                  <td>
                    <div className="document-name">
                      <span className="document-icon">📄</span>
                      <span>{file.name}</span>
                    </div>
                  </td>

                  <td>{formatSize(file.size)}</td>

                  <td>
                    {new Date(file.uploadedAt).toLocaleDateString()}
                  </td>

                  <td>
                    <span className={`document-status ${file.status}`}>
                      {file.status}
                    </span>
                  </td>

                  <td>
                    <div className="document-actions">
                      <button
                        onClick={() => handleDownload(file.id)}
                        className="document-download"
                      >
                        Download
                      </button>

                      <button
                        onClick={() => handleDelete(file.id, file.name)}
                        className="document-delete"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default DocumentsPage
