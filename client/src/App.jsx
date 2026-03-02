import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import Layout from './components/Layout'
import SignIn from './components/SignIn'
import Home from './components/Home'
import EventDetails from './components/EventDetails'
import Landing from './components/Landing'
import Gallery from './components/Gallery'
import About from './components/About'
import Contact from './components/Contact'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" richColors />
      <Routes>
        {/* All routes share the Header via Layout */}
        <Route path="/" element={<SignIn />} />
        <Route element={<Layout />}>
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/home" element={<Home />} />
          <Route path="/event/:id" element={<EventDetails />} />
        </Route>

      </Routes>
    </BrowserRouter>
  )
}

export default App
