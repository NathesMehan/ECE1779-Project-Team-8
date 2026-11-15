
import { recordActivity } from './mockActivityApi'

import type {
  WorkspaceMember,
  AddMemberInput,
} from '../types/member'

const STORAGE_PREFIX = 'llm-context-members-'

function getStorageKey(workspaceId: string): string {
  return `${STORAGE_PREFIX}${workspaceId}`
}

// Return members belonging to a workspace.
export async function getMembers(
  workspaceId: string
): Promise<WorkspaceMember[]> {
  const key = getStorageKey(workspaceId)
  const stored = localStorage.getItem(key)

  if (stored !== null) {
    return JSON.parse(stored) as WorkspaceMember[]
  }

  // Temporary owner record until authentication is integrated.
  const owner: WorkspaceMember = {
    id: crypto.randomUUID(),
    workspaceId,
    name: 'You (Demo Owner)',
    email: 'owner@example.test',
    role: 'owner',
    joinedAt: new Date().toISOString(),
  }

  const members = [owner]
  localStorage.setItem(key, JSON.stringify(members))

  return members
}

// Simulate adding an existing user to a workspace.
export async function addMember(
  workspaceId: string,
  input: AddMemberInput
): Promise<WorkspaceMember> {
  const members = await getMembers(workspaceId)
  const email = input.email.trim().toLowerCase()

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!validEmail.test(email)) {
    throw new Error('Please enter a valid email address.')
  }

  const alreadyExists = members.some(
    (member) => member.email.toLowerCase() === email
  )

  if (alreadyExists) {
    throw new Error('This member already belongs to the workspace.')
  }

  
    const name = input.name.trim()

    if (!name) {
    throw new Error('Member name is required.')
    }

    const newMember: WorkspaceMember = {
    id: crypto.randomUUID(),
    workspaceId,
    name,
    email,
    role: 'member',
    joinedAt: new Date().toISOString(),
    }


  const updatedMembers = [...members, newMember]

  localStorage.setItem(
    getStorageKey(workspaceId),
    JSON.stringify(updatedMembers)
  )


  recordActivity({
    workspaceId,
    type: 'member_added',
    description: `Added member "${newMember.name}" (${newMember.email})`,
  })


  return newMember
}

// Simulate removing a workspace member.
export async function removeMember(
  workspaceId: string,
  memberId: string
): Promise<void> {
  const members = await getMembers(workspaceId)
  const member = members.find((item) => item.id === memberId)

  if (!member) {
    throw new Error('Member not found.')
  }

  if (member.role === 'owner') {
    throw new Error('The workspace owner cannot be removed.')
  }

  const updatedMembers = members.filter(
    (item) => item.id !== memberId
  )

  localStorage.setItem(
    getStorageKey(workspaceId),
    JSON.stringify(updatedMembers)
  )


  recordActivity({
    workspaceId,
    type: 'member_removed',
    description: `Removed member "${member.name}" (${member.email})`,
  })

  
}
