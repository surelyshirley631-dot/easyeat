import { useContext } from 'react'
import { profileStoreContext } from './profileStoreContext'

export const useProfileStore = () => {
  const context = useContext(profileStoreContext)
  if (!context) {
    throw new Error('useProfileStore must be used within ProfileStoreProvider')
  }

  return context
}
