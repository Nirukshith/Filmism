import { createContext, useState, useEffect } from 'react'
import api from '../services/api'

export const TasteContext = createContext()

export function TasteProvider({ children }) {
  const [selectedGenres, setSelectedGenres]   = useState([])
  const [selectedCinemas, setSelectedCinemas] = useState([])
  const [selectedFilms, setSelectedFilms]     = useState([])
  const [favoriteRatings, setFavoriteRatings] = useState({}) // { [tmdbId]: ratingNumber }
  const [tasteClusters, setTasteClusters]     = useState([])
  const [userTasteProfile, setUserTasteProfile] = useState(null)
  const [aiSynthesis, setAiSynthesis]         = useState('')
  const [sessionId, setSessionId]             = useState(() => {
    return localStorage.getItem('filmism_session_id') || `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  })

  const [ratings, setRatings]                 = useState({})
  const [watchlist, setWatchlist]             = useState([])
  const [haventSeen, setHaventSeen]           = useState([])
  const [aestheticProfile, setAestheticProfile] = useState(null)

  // Save guest sessionId
  useEffect(() => {
    if (sessionId) {
      localStorage.setItem('filmism_session_id', sessionId)
    }
  }, [sessionId])

  // Load initial profile data from logged-in user or session if saved in localStorage
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

    const storedClusters = localStorage.getItem('filmism_taste_clusters')
    if (storedClusters) {
      try {
        setTasteClusters(JSON.parse(storedClusters))
      } catch (e) {}
    }

    const storedSynthesis = localStorage.getItem('filmism_ai_synthesis')
    if (storedSynthesis) {
      setAiSynthesis(storedSynthesis)
    }
  }, [])

  // Set or update a single favorite film rating (1-4, or 0)
  const setFilmRating = (tmdbId, ratingNumber) => {
    setFavoriteRatings((prev) => ({
      ...prev,
      [tmdbId]: ratingNumber,
    }))
  }

  // Initialize taste profile and clusters with backend AI engine
  const initializeProfile = async ({ genres, origins, films, ratingsMap = {} }) => {
    try {
      const g = genres || selectedGenres
      const o = origins || selectedCinemas
      const f = films || selectedFilms

      const favoritesPayload = (f || [])
        .map((item) => {
          const rawId = typeof item === 'object' && item !== null ? (item.tmdbId || item.id) : item;
          const cleanId = Number(rawId);
          if (isNaN(cleanId) || cleanId <= 0) return null;
          const rating =
            ratingsMap[cleanId] !== undefined
              ? ratingsMap[cleanId]
              : (favoriteRatings[cleanId] !== undefined
                  ? favoriteRatings[cleanId]
                  : (typeof item === 'object' && item?.rating !== undefined ? item.rating : 3));
          return {
            tmdbId: cleanId,
            rating: Number(rating) || 3,
          };
        })
        .filter(Boolean);

      const response = await api.post('/taste-profile/initialize', {
        genres: g,
        origins: o,
        favorites: favoritesPayload,
        sessionId,
      })

      if (response.data?.success) {
        const { tasteProfile, clusters, aiSynthesis: synthesis, sessionId: newSessionId, token: updatedToken } = response.data
        setUserTasteProfile(tasteProfile)
        setTasteClusters(clusters || [])
        setAiSynthesis(synthesis || '')

        if (updatedToken) {
          localStorage.setItem('token', updatedToken)
        }

        const storedUser = localStorage.getItem('user')
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser)
            parsedUser.tasteProfileComplete = true
            localStorage.setItem('user', JSON.stringify(parsedUser))
          } catch (e) {}
        }

        if (newSessionId) {
          setSessionId(newSessionId)
          localStorage.setItem('filmism_session_id', newSessionId)
        }

        localStorage.setItem('filmism_taste_clusters', JSON.stringify(clusters || []))
        if (synthesis) localStorage.setItem('filmism_ai_synthesis', synthesis)

        return response.data
      }
    } catch (error) {
      console.error('Failed to initialize taste profile:', error)
      throw error
    }
  }

  // Incrementally append new favorites and ratings to existing taste profile
  const appendProfileFavorites = async ({ films, ratingsMap = {} }) => {
    try {
      const favoritesPayload = (films || [])
        .map((item) => {
          const rawId = typeof item === 'object' && item !== null ? (item.tmdbId || item.id) : item;
          const cleanId = Number(rawId);
          if (isNaN(cleanId) || cleanId <= 0) return null;
          const rating =
            ratingsMap[cleanId] !== undefined
              ? ratingsMap[cleanId]
              : (favoriteRatings[cleanId] !== undefined
                  ? favoriteRatings[cleanId]
                  : (typeof item === 'object' && item?.rating !== undefined ? item.rating : 3));
          return {
            tmdbId: cleanId,
            rating: Number(rating) || 3,
          };
        })
        .filter(Boolean);

      const response = await api.post('/taste-profile/append', {
        favorites: favoritesPayload,
        sessionId,
      })

      if (response.data?.success) {
        const { tasteProfile, clusters, aiSynthesis: synthesis, sessionId: newSessionId } = response.data
        setUserTasteProfile(tasteProfile)
        setTasteClusters(clusters || [])
        if (synthesis) setAiSynthesis(synthesis)

        setSelectedFilms((prev) => Array.from(new Set([...prev, ...(films || [])])))
        setFavoriteRatings((prev) => ({ ...prev, ...ratingsMap }))

        if (newSessionId) {
          setSessionId(newSessionId)
          localStorage.setItem('filmism_session_id', newSessionId)
        }

        const storedUser = localStorage.getItem('user')
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser)
            parsedUser.tasteProfileComplete = true
            localStorage.setItem('user', JSON.stringify(parsedUser))
          } catch (e) {}
        }

        localStorage.setItem('filmism_taste_clusters', JSON.stringify(clusters || []))
        if (synthesis) localStorage.setItem('filmism_ai_synthesis', synthesis)

        return response.data
      }
    } catch (error) {
      console.error('Failed to append taste profile favorites:', error)
      throw error
    }
  }

  // Sync taste profile preferences to legacy auth profile if needed
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

      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        const user = JSON.parse(storedUser)
        const updatedUser = { ...user, ...response.data }
        localStorage.setItem('user', JSON.stringify(updatedUser))
      }

      return response.data
    } catch (error) {
      console.error('Failed to sync taste profile with backend:', error)
      // Do not block flow on legacy auth failure
      return null
    }
  }

  const clearProfile = () => {
    setSelectedGenres([])
    setSelectedCinemas([])
    setSelectedFilms([])
    setFavoriteRatings({})
    setTasteClusters([])
    setUserTasteProfile(null)
    setAiSynthesis('')
    setRatings({})
    setWatchlist([])
    setHaventSeen([])
    setAestheticProfile(null)
    localStorage.removeItem('filmism_taste_clusters')
    localStorage.removeItem('filmism_ai_synthesis')
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
        favoriteRatings,
        setFavoriteRatings,
        setFilmRating,
        tasteClusters,
        setTasteClusters,
        userTasteProfile,
        setUserTasteProfile,
        aiSynthesis,
        ratings,
        setRatings,
        watchlist,
        setWatchlist,
        haventSeen,
        setHaventSeen,
        aestheticProfile,
        setAestheticProfile,
        initializeProfile,
        appendProfileFavorites,
        syncTasteProfile,
        clearProfile,
        sessionId,
      }}
    >
      {children}
    </TasteContext.Provider>
  )
}