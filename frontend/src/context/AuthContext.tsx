
import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from 'react'

import type {
  User,
  LoginInput,
  RegisterInput,
} from '../types/auth'

import {
  loginUser,
  registerUser,
  logoutUser,
  getCurrentUser,
} from '../api/mockAuthApi'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: (input: LoginInput) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(
  undefined
)

export function AuthProvider({
  children,
}: {
  children: ReactNode
}) {
  const [user, setUser] = useState<User | null>(
    () => getCurrentUser()
  )

  async function login(input: LoginInput) {
    const authenticatedUser = await loginUser(input)
    setUser(authenticatedUser)
  }

  async function register(input: RegisterInput) {
    const newUser = await registerUser(input)
    setUser(newUser)
  }

  function logout() {
    logoutUser()
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}
