import { createContext } from 'react'
import type { ProfileStoreValue } from './profileStoreTypes'

export const profileStoreContext = createContext<ProfileStoreValue | null>(null)
