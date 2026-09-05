import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/landing'
import TasteProfile from './pages/TasteProfile'
import Recommendations from './pages/Recommendations'
import Watchlist from './pages/Watchlist'
import Diary from './pages/Diary'
import Settings from './pages/Settings'
import LoginPage from './pages/AuthLogin'
import RegisterPage from './pages/Register'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/landing" element={<Landing />} />
        <Route
          path="/taste"
          element={
            <ProtectedRoute requireComplete={false}>
              <TasteProfile />
            </ProtectedRoute>
          }
        />
        <Route path="/deepdive" element={<Navigate to="/recommend" replace />} />
        <Route
          path="/recommend"
          element={
            <ProtectedRoute requireComplete={true}>
              <Recommendations />
            </ProtectedRoute>
          }
        />
        <Route
          path="/watchlist"
          element={
            <ProtectedRoute requireComplete={true}>
              <Watchlist />
            </ProtectedRoute>
          }
        />
        <Route
          path="/diary"
          element={
            <ProtectedRoute requireComplete={true}>
              <Diary />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute requireComplete={false}>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App