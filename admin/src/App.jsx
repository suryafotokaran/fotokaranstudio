import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import SignIn from './components/SignIn'
import Dashboard from './components/Dashboard'
import Home from './components/Home'
import EventDetails from './components/EventDetails'
import BookingManager from './components/BookingManager'
import BookingCalendar from './components/BookingCalendar'
import Compress from './components/Compress'
import ClientList from './components/ClientList'
import ClientManager from './components/ClientManager'
import PaymentStatus from './components/PaymentStatus'
import WebsiteManagement from './components/WebsiteManagement'
import { Toaster } from './components/ui/sonner'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
)

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-gray-900 text-xl font-medium">Loading...</div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route
          path="/signin"
          element={session ? <Navigate to="/home" /> : <SignIn />}
        />
        {/* Dashboard — main landing page */}
        <Route
          path="/home"
          element={session ? <Dashboard /> : <Navigate to="/signin" />}
        />
        {/* Photo Management — existing event flow */}
        <Route
          path="/photos"
          element={session ? <Home /> : <Navigate to="/signin" />}
        />
        <Route
          path="/event/:id"
          element={session ? <EventDetails /> : <Navigate to="/signin" />}
        />
        <Route
          path="/bookings"
          element={session ? <BookingManager /> : <Navigate to="/signin" />}
        />
        <Route
          path="/calendar"
          element={session ? <BookingCalendar /> : <Navigate to="/signin" />}
        />
        <Route
          path="/compress"
          element={session ? <Compress /> : <Navigate to="/signin" />}
        />
        <Route
          path="/clients"
          element={session ? <ClientList /> : <Navigate to="/signin" />}
        />
        <Route
          path="/clients/:id"
          element={session ? <ClientManager /> : <Navigate to="/signin" />}
        />
        <Route
          path="/payments"
          element={session ? <PaymentStatus /> : <Navigate to="/signin" />}
        />
        <Route
          path="/website"
          element={session ? <WebsiteManagement /> : <Navigate to="/signin" />}
        />
        <Route path="/" element={<Navigate to="/signin" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
