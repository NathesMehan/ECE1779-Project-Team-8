
import type {
  User,
  LoginInput,
  RegisterInput,
} from '../types/auth'

const USERS_KEY = 'llm-context-users'
const SESSION_KEY = 'llm-context-session'

interface StoredUser extends User {
  passwordSalt: string
  passwordHash: string
}

function readUsers(): StoredUser[] {
  const stored = localStorage.getItem(USERS_KEY)
  return stored ? JSON.parse(stored) as StoredUser[] : []
}

// Derive a salted password value for mock verification.
// This does NOT provide real server-side authentication.
async function hashPassword(
  password: string,
  salt: string
): Promise<string> {
  const encoder = new TextEncoder()

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )

  const bytes = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    key,
    256
  )

  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

// Create a mock user account.
export async function registerUser(
  input: RegisterInput
): Promise<User> {
  const name = input.name.trim()
  const email = input.email.trim().toLowerCase()

  if (!name) {
    throw new Error('Full name is required.')
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Enter a valid email address.')
  }

  if (input.password.length < 8) {
    throw new Error('Password must contain at least 8 characters.')
  }

  const users = readUsers()

  if (users.some((user) => user.email === email)) {
    throw new Error('An account with this email already exists.')
  }

  const salt = crypto.randomUUID()
  const passwordHash = await hashPassword(input.password, salt)

  const user: StoredUser = {
    id: crypto.randomUUID(),
    name,
    email,
    passwordSalt: salt,
    passwordHash,
  }

  users.push(user)
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
  localStorage.setItem(SESSION_KEY, user.id)

  return {
    id: user.id,
    name: user.name,
    email: user.email,
  }
}

// Verify mock credentials and start a local session.
export async function loginUser(
  input: LoginInput
): Promise<User> {
  const email = input.email.trim().toLowerCase()

  const user = readUsers().find(
    (stored) => stored.email === email
  )

  if (!user) {
    throw new Error('Invalid email or password.')
  }

  const hash = await hashPassword(
    input.password,
    user.passwordSalt
  )

  if (hash !== user.passwordHash) {
    throw new Error('Invalid email or password.')
  }

  localStorage.setItem(SESSION_KEY, user.id)

  return {
    id: user.id,
    name: user.name,
    email: user.email,
  }
}

// Restore the mock session after a browser refresh.
export function getCurrentUser(): User | null {
  const userId = localStorage.getItem(SESSION_KEY)

  if (!userId) return null

  const user = readUsers().find(
    (stored) => stored.id === userId
  )

  if (!user) {
    localStorage.removeItem(SESSION_KEY)
    return null
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
  }
}

export function logoutUser(): void {
  localStorage.removeItem(SESSION_KEY)
}
