import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn()
}))

// Mock next-auth/react for client components
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({
    data: null,
    status: 'unauthenticated'
  })),
  signIn: vi.fn(),
  signOut: vi.fn()
}))

// Mock database pool
vi.mock('@/lib/db', () => ({
  pool: {
    query: vi.fn()
  }
}))

// Mock Redis
vi.mock('ioredis', () => ({
  default: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    keys: vi.fn(),
    quit: vi.fn()
  }))
}))
