
import { recordActivity } from './mockActivityApi'

import type {
  Workspace,
  CreateWorkspaceInput,
} from '../types/workspace'

const STORAGE_KEY = 'llm-context-workspaces'

// Simulates fetching workspaces from the backend.
export async function getWorkspaces(): Promise<Workspace[]> {
  const stored = localStorage.getItem(STORAGE_KEY)

  return stored ? JSON.parse(stored) as Workspace[] : []
}

// Simulates creating a workspace through the backend.
export async function createWorkspace(
  input: CreateWorkspaceInput
): Promise<Workspace> {
  const workspaces = await getWorkspaces()

  const newWorkspace: Workspace = {
    id: crypto.randomUUID(),
    name: input.name,
    description: input.description,
    role: 'owner',
    createdAt: new Date().toISOString(),
  }

  workspaces.push(newWorkspace)

  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaces))

  recordActivity({
    workspaceId: newWorkspace.id,
    type: 'workspace_created',
    description: `Created workspace "${newWorkspace.name}"`,
  })

  return newWorkspace

  
}

export async function getWorkspaceById(
  id: string
): Promise<Workspace | null> {
  const workspaces = await getWorkspaces()

  return workspaces.find((workspace) => workspace.id === id) ?? null
}
