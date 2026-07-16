import { createContext, useState, useEffect } from 'react'
import api from '../services/api'

export const TasteContext = createContext()

export function TasteProvider({ children }) {
  const [selectedGenres, setSelectedGenres]   = useState([])
  const [selectedCinemas, setSelectedCinemas] = useState([])
  const [selectedFilms, setSelectedFilms]     = useState([])
  const [ratings, setRatings]                 = useState({})
  const [watchlist, setWatchlist]             = useState([])
  const [haventSeen, setHaventSeen]           = useState([])
  const [aestheticProfile, setAestheticProfile] = useState(null)

  // Load initial profile data from logged-in user if saved in localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser)
        if (user.selectedGenres)  setSelectedGenres(user.selectedGenres)
        if (user.selectedCinemas) setSelectedCinemas(user.selectedCinemas)
        if (user.selectedPosters) setSelectedFilms(user.selectedPosters)
        if (user.aestheticProfile) setAestheticProfile(user.aestheticProfile)
      } catch (err) {
        console.error('Error parsing stored user data:', err)
      }
    }
  }, [])

  // Sync taste profile preferences to the backend
  const syncTasteProfile = async (updatedData = {}) => {
    try {
      const genres = updatedData.selectedGenres ?? selectedGenres
      const cinemas = updatedData.selectedCinemas ?? selectedCinemas
      const films = updatedData.selectedFilms ?? selectedFilms
      const aesthetic = updatedData.aestheticProfile ?? aestheticProfile

      const response = await api.put('/auth/profile', {
        selectedGenres: genres,
        selectedCinemas: cinemas,
        selectedPosters: films,
        aestheticProfile: aesthetic,
      })

      // Update local storage user profile with updated details
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        const user = JSON.parse(storedUser)
        const updatedUser = { ...user, ...response.data }
        localStorage.setItem('user', JSON.stringify(updatedUser))
      }

      return response.data
    } catch (error) {
      console.error('Failed to sync taste profile with backend:', error)
      throw error
    }
  }

  const clearProfile = () => {
    setSelectedGenres([])
    setSelectedCinemas([])
    setSelectedFilms([])
    setRatings({})
    setWatchlist([])
    setHaventSeen([])
    setAestheticProfile(null)
  }

  return (
    <TasteContext.Provider
      value={{
        selectedGenres,
        setSelectedGenres,
        selectedCinemas,
        setSelectedCinemas,
        selectedFilms,
        setSelectedFilms,
        ratings,
        setRatings,
        watchlist,
        setWatchlist,
        haventSeen,
        setHaventSeen,
        aestheticProfile,
        setAestheticProfile,
        syncTasteProfile,
        clearProfile,
      }}
    >
      {children}
    </TasteContext.Provider>
  )
}