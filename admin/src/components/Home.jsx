import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useNavigate } from 'react-router-dom'
import {
  LogOut, Plus, Eye, Users, Zap, ArrowLeft,
  Calendar, Camera, Search, MapPin, User, CheckCircle2, Clock, Phone
} from 'lucide-react'
import { toast } from 'sonner'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

function statusStyle(status) {
  if (status === 'completed') return 'bg-green-50 text-green-700 border-green-200'
  if (status === 'cancelled') return 'bg-red-50 text-red-700 border-red-200'
  return 'bg-blue-50 text-blue-700 border-blue-200'
}

function paymentLabel(event) {
  const quote = event.price_quote || 0
  const advance = event.advance_paid || 0
  if (!quote) return null
  const remaining = quote - advance
  if (remaining <= 0) return { label: 'Fully Paid', cls: 'bg-green-50 text-green-700 border-green-200' }
  if (advance > 0) return { label: `Adv ₹${advance.toLocaleString()} · Bal ₹${remaining.toLocaleString()}`, cls: 'bg-orange-50 text-orange-700 border-orange-200' }
  return { label: 'Unpaid', cls: 'bg-red-50 text-red-700 border-red-200' }
}

const formatTime12h = (time24) => {
  if (!time24) return '—'
  const [hours, minutes] = time24.split(':')
  const h = parseInt(hours)
  const period = h >= 12 ? 'PM' : 'AM'
  const displayHour = h % 12 === 0 ? 12 : h % 12
  return `${displayHour}:${minutes} ${period}`
}

const formatDateLong = (dateStr) => {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

export default function Home() {
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => { fetchEvents() }, [])

  async function fetchEvents() {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*, event_images(count)')
        .order('event_date', { ascending: false })
      if (error) throw error
      setEvents(data || [])
    } catch (error) {
      toast.error('Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  function handleSignOut() {
    setSigningOut(true)
    supabase.auth.signOut()
    navigate('/home')
  }

  const filtered = events.filter(e => {
    const name = e.event_name || e.wedding_name || ''
    const client = e.client_name || ''
    const place = e.event_place || e.place || ''
    const q = search.toLowerCase()
    const matchSearch = !q ||
      name.toLowerCase().includes(q) ||
      client.toLowerCase().includes(q) ||
      place.toLowerCase().includes(q)
    const matchStatus = filterStatus === 'All' || e.status === filterStatus
    return matchSearch && matchStatus
  })

  const statusOptions = ['All', 'upcoming', 'completed', 'cancelled']

  return (
    <div className="min-h-screen bg-[#f5f5f7]">

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-3 sm:px-8 py-3 sm:py-4 flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => navigate('/home')}
            className="p-2 sm:p-2.5 rounded-xl hover:bg-gray-100 text-gray-600 transition-all cursor-pointer border border-gray-200 shrink-0"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div className="p-2 sm:p-2.5 bg-blue-600 rounded-xl shadow-md shadow-blue-600/30 shrink-0">
              <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-[22px] font-bold text-gray-900 leading-tight truncate">Photo Management</h1>
              <p className="text-xs sm:text-sm text-gray-600">{events.length} event{events.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <button
              onClick={() => navigate('/compress')}
              className="flex items-center gap-2 p-2 sm:px-4 sm:py-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-200 text-sm font-medium hover:bg-amber-100 transition-all cursor-pointer"
              title="Compress"
            >
              <Zap className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Compress</span>
            </button>
            <button
              onClick={() => navigate('/clients')}
              className="flex items-center gap-2 p-2 sm:px-4 sm:py-2 bg-violet-50 text-violet-700 rounded-xl border border-violet-200 text-sm font-medium hover:bg-violet-100 transition-all cursor-pointer"
              title="Clients"
            >
              <Users className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Clients</span>
            </button>
            <button
              onClick={() => setShowSignOutConfirm(true)}
              className="flex items-center gap-2 p-2 sm:px-4 sm:py-2 bg-red-50 text-red-600 rounded-xl border border-red-200 text-sm font-medium hover:bg-red-100 transition-all cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-5">

        {/* ── Search + Filter + Add Booking ── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
            <input
              type="text"
              placeholder="Search events, clients, places…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
            />
          </div>
          <div className="flex gap-2">
            {/* Status filter pills */}
            <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
              {statusOptions.map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer capitalize ${filterStatus === s ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-700'}`}
                >
                  {s}
                </button>
              ))}
            </div>
            <button
              onClick={() => navigate('/bookings')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Booking</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>

        {/* ── Events Grid ── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse">
                <div className="h-4 bg-gray-100 rounded-lg mb-3 w-3/4" />
                <div className="h-3 bg-gray-100 rounded-lg mb-2 w-1/2" />
                <div className="h-3 bg-gray-100 rounded-lg w-2/3" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm py-20 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Camera className="w-7 h-7 text-gray-600" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1">
              {search || filterStatus !== 'All' ? 'No events match your search' : 'No events yet'}
            </h3>
            <p className="text-sm text-gray-600 mb-5">
              {search || filterStatus !== 'All' ? 'Try adjusting your filters.' : 'Create a booking first to manage photos.'}
            </p>
            {!search && filterStatus === 'All' && (
              <button
                onClick={() => navigate('/bookings')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Booking
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(event => {
              const name = event.event_name || event.wedding_name || '—'
              const date = event.event_date || event.date || '—'
              const place = event.event_place || event.place || null
              const photoCount = event.event_images?.[0]?.count || 0
              const payment = paymentLabel(event)
              return (
                <div
                  key={event.id}
                  className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 flex flex-col overflow-hidden"
                >
                  {/* Status accent bar */}
                  <div className={`h-1.5 ${event.status === 'completed' ? 'bg-gradient-to-r from-green-400 to-emerald-500' : event.status === 'cancelled' ? 'bg-gradient-to-r from-red-400 to-red-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'}`} />

                  <div className="p-5 flex flex-col gap-3.5 flex-1">
                    {/* Title + photo count + status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-extrabold text-gray-900 text-xl leading-snug truncate max-w-[70%]">{name}</h3>
                          {event.status && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusStyle(event.status)}`}>
                              {event.status}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold border border-blue-100">
                          <Camera className="w-3.5 h-3.5" />
                          {photoCount}
                        </span>
                      </div>
                    </div>

                    {/* Client */}
                    {event.client_name && (
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <div className="flex items-center gap-1.5 font-bold">
                          <User className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>{event.client_name}</span>
                        </div>
                        {event.client_phone && (
                          <div className="flex items-center gap-1.5 text-gray-500 font-medium">
                            <span className="text-gray-300">·</span>
                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                            <span>{event.client_phone}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Date + Place */}
                    <div className="flex flex-wrap items-center gap-2.5 text-sm font-medium text-gray-600">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-gray-600 shrink-0" />
                        {formatDateLong(date)}
                      </span>
                      {event.start_time && event.end_time && (
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-gray-600 shrink-0" />
                          {formatTime12h(event.start_time)}–{formatTime12h(event.end_time)}
                        </span>
                      )}
                      {place && (
                        <span className="flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                          <MapPin className="w-3 h-3" />
                          {place}
                        </span>
                      )}
                    </div>

                    {/* Payment badge */}
                    {payment && (
                      <span className={`self-start px-3 py-1 rounded-full text-xs font-black border ${payment.cls}`}>
                        {payment.label}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="px-5 pb-5 flex items-center gap-2 border-t border-gray-100 pt-3.5 mt-auto">
                    <button
                      onClick={() => navigate(`/event/${event.id}`)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-600/10 transition-all cursor-pointer"
                    >
                      <Eye className="w-4 h-4" /> Manage Photos
                    </button>
                    <button
                      onClick={() => navigate('/bookings')}
                      className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-all cursor-pointer border border-gray-200"
                      title="View in Bookings"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Sign Out Confirmation */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-red-500 to-rose-600" />
            <div className="p-6">
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                <LogOut className="w-6 h-6 text-red-500" />
              </div>
              <h2 className="text-lg font-black text-gray-900 text-center mb-1">Sign Out?</h2>
              <p className="text-sm text-gray-600 text-center mb-6">You'll need to sign in again to access the admin panel.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSignOutConfirm(false)}
                  className="flex-1 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="flex-1 py-2.5 text-sm font-black text-white bg-red-500 hover:bg-red-600 rounded-xl shadow-md shadow-red-100 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {signingOut
                    ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : <><LogOut className="w-4 h-4" /> Sign Out</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
