import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import SignIn from './components/SignIn'
import Home from './components/Home'
import EventDetails from './components/EventDetails'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" richColors />
      <Routes>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/home" element={<Home />} />
        <Route path="/event/:id" element={<EventDetails />} />
        {/* Redirect root to home if authenticated, else signin */}
        {/* For now, just redirect root to signin to keep it simple */}
        <Route path="/" element={<Navigate to="/signin" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
