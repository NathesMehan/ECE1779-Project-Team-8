import { recordActivity } from './mockActivityApi'

import type { WorkspaceDocument } from '../types/document'

const DB_NAME = 'llm-context-document-db'
const STORE_NAME = 'documents'
const DB_VERSION = 1

export const MAX_FILE_SIZE = 10 * 1024 * 1024

const ALLOWED_EXTENSIONS = [
  'pdf', 'doc', 'docx',
  'txt', 'md',
  'png', 'jpg', 'jpeg',
  'py', 'js', 'jsx', 'ts', 'tsx',
  'json', 'csv', 'html', 'css',
]

interface StoredDocument {
  metadata: WorkspaceDocument
  file: Blob
}

// Open or create the browser's document database.
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: 'metadata.id',
        })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// Save a document and its file contents.
async function saveDocument(
  document: StoredDocument
): Promise<void> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    store.put(document)

    transaction.oncomplete = () => {
      db.close()
      resolve()
    }

    transaction.onerror = () => {
      db.close()
      reject(transaction.error)
    }
  })
}

// Return documents belonging to one workspace.
export async function getDocuments(
  workspaceId: string
): Promise<WorkspaceDocument[]> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const request = transaction.objectStore(STORE_NAME).getAll()

    request.onsuccess = () => {
      const documents = request.result as StoredDocument[]

      resolve(
        documents
          .filter((item) => item.metadata.workspaceId === workspaceId)
          .map((item) => item.metadata)
          .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
      )
    }

    request.onerror = () => reject(request.error)
    transaction.oncomplete = () => db.close()
  })
}

// Validate and store an uploaded file.
export async function uploadDocument(
  workspaceId: string,
  file: File
): Promise<WorkspaceDocument> {
  const extension = file.name.split('.').pop()?.toLowerCase()

  if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
    throw new Error(`Unsupported file type: ${file.name}`)
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`${file.name} exceeds the 10 MB limit.`)
  }

  if (file.size === 0) {
    throw new Error(`${file.name} is empty.`)
  }

  const metadata: WorkspaceDocument = {
    id: crypto.randomUUID(),
    workspaceId,
    name: file.name,
    size: file.size,
    type: file.type || extension,
    // Mock success only. No document extraction occurs here.
    status: 'completed',
    uploadedAt: new Date().toISOString(),
  }

  
  await saveDocument({ metadata, file })

  recordActivity({
    workspaceId,
    type: 'document_uploaded',
    description: `Uploaded document "${file.name}"`,
  })

  return metadata

  
}

// Retrieve a stored file for downloading.
export async function downloadDocument(
  documentId: string
): Promise<void> {
  const db = await openDatabase()

  const stored = await new Promise<StoredDocument | undefined>(
    (resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const request = transaction.objectStore(STORE_NAME).get(documentId)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
      transaction.oncomplete = () => db.close()
    }
  )

  if (!stored) {
    throw new Error('Document not found.')
  }

  const url = URL.createObjectURL(stored.file)
  const link = document.createElement('a')

  link.href = url
  link.download = stored.metadata.name

  document.body.appendChild(link)
  link.click()
  link.remove()

  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Remove a document from browser storage.
export async function deleteDocument(
  documentId: string
): Promise<void> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')

    transaction.objectStore(STORE_NAME).delete(documentId)

    transaction.oncomplete = () => {
      db.close()
      resolve()
    }

    transaction.onerror = () => {
      db.close()
      reject(transaction.error)
    }
  })
}
