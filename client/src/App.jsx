import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/landing'
import TasteProfile from './pages/TasteProfile'
import DeepDive from './pages/DeepDive'
import Recommendations from './pages/Recommendations'
import LoginPage from './pages/AuthLogin'
import RegisterPage from './pages/Register'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/taste" element={<TasteProfile />} />
        <Route path="/deepdive" element={<DeepDive />} />
        <Route path="/recommend" element={<Recommendations />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />

      </Routes>
    </BrowserRouter>
  )
}

export default App