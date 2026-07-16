import { useContext } from 'react'
import { TasteContext } from '../context/TasteContext'

export function useTasteProfile() {
  const context = useContext(TasteContext)
  if (!context) {
    throw new Error('useTasteProfile must be used within a TasteProvider')
  }
  return context
}
