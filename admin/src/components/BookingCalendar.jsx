import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, X, User, Clock, MapPin, IndianRupee } from 'lucide-react'
import { toast } from 'sonner'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
)

export default function BookingCalendar() {
    const navigate = useNavigate()
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedEvent, setSelectedEvent] = useState(null)

    useEffect(() => {
        fetchEvents()
    }, [])

    async function fetchEvents() {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('events')
                .select('*')

            if (error) throw error

            const mappedEvents = (data || []).map(event => ({
                id: event.id.toString(),
                title: event.event_name || event.wedding_name,
                start: `${event.event_date || event.date}T${event.start_time || '00:00:00'}`,
                end: `${event.event_date || event.date}T${event.end_time || '23:59:59'}`,
                backgroundColor: getEventColor(event.status),
                borderColor: getEventColor(event.status),
                extendedProps: { ...event }
            }))

            setEvents(mappedEvents)
        } catch (error) {
            toast.error('Failed to load events')
        } finally {
            setLoading(false)
        }
    }

    function getEventColor(status) {
        switch (status) {
            case 'completed': return '#10b981' // Green
            case 'cancelled': return '#ef4444' // Red
            default: return '#3b82f6' // Blue (upcoming)
        }
    }

    function handleEventClick(info) {
        setSelectedEvent(info.event.extendedProps)
    }

    function handleDateClick(info) {
        // Optionally redirect to booking manager for that date
    }

    return (
        <div className="min-h-screen bg-[#f8f9fa]">
            <style>
                {`
                    /* ── Toolbar layout ── */
                    .fc .fc-toolbar {
                        display: grid;
                        grid-template-areas:
                            "nav    title   views";
                        grid-template-columns: auto 1fr auto;
                        align-items: center;
                        gap: 0.5rem;
                        margin-bottom: 1rem !important;
                    }

                    .fc .fc-toolbar-chunk:nth-child(1) { grid-area: nav; display: flex; flex-direction: row; align-items: center; gap: 4px; }
                    .fc .fc-toolbar-chunk:nth-child(2) { grid-area: title; text-align: center; }
                    .fc .fc-toolbar-chunk:nth-child(3) { grid-area: views; }

                    @media (max-width: 480px) {
                        .fc .fc-toolbar {
                            grid-template-areas:
                                "title  title"
                                "nav    views";
                            grid-template-columns: 1fr auto;
                            gap: 0.5rem;
                        }
                        .fc .fc-toolbar-chunk:nth-child(2) { text-align: left; }
                    }

                    /* ── Title ── */
                    .fc .fc-toolbar-title {
                        font-size: 1.1rem !important;
                        font-weight: 900 !important;
                        color: #111827;
                    }

                    @media (max-width: 480px) {
                        .fc .fc-toolbar-title {
                            font-size: 1rem !important;
                        }
                    }

                    /* ── Buttons ── */
                    .fc .fc-button {
                        background: #fff !important;
                        border: 1px solid #e5e7eb !important;
                        color: #374151 !important;
                        font-weight: 700 !important;
                        font-size: 0.75rem !important;
                        padding: 0.4rem 0.6rem !important;
                        text-transform: capitalize !important;
                        border-radius: 0.6rem !important;
                        box-shadow: none !important;
                        transition: background 0.15s, border-color 0.15s;
                        white-space: nowrap;
                    }

                    .fc .fc-button:hover {
                        background: #f9fafb !important;
                        border-color: #d1d5db !important;
                    }

                    .fc .fc-button-active,
                    .fc .fc-button-active:hover {
                        background: #111827 !important;
                        border-color: #111827 !important;
                        color: #fff !important;
                    }

                    .fc .fc-today-button { opacity: 1 !important; }

                    .fc .fc-button-group { gap: 2px; display: flex; }
                    .fc .fc-button-group .fc-button { border-radius: 0.6rem !important; }

                    /* ── Day header ── */
                    .fc .fc-col-header-cell-cushion {
                        font-size: 0.6rem;
                        font-weight: 900;
                        text-transform: uppercase;
                        letter-spacing: 0.08em;
                        color: #9ca3af;
                        padding: 0.5rem 0 !important;
                    }

                    /* ── Day number ── */
                    .fc .fc-daygrid-day-number {
                        font-size: 0.7rem;
                        font-weight: 700;
                        color: #9ca3af;
                        padding: 0.3rem 0.4rem !important;
                    }

                    /* ── Day cell height ── */
                    .fc .fc-daygrid-day-frame {
                        min-height: 52px !important;
                    }

                    @media (max-width: 480px) {
                        .fc .fc-daygrid-day-frame {
                            min-height: 40px !important;
                        }
                        .fc .fc-daygrid-day-number {
                            font-size: 0.65rem;
                            padding: 0.2rem 0.3rem !important;
                        }
                        .fc .fc-col-header-cell-cushion {
                            font-size: 0.55rem;
                            padding: 0.3rem 0 !important;
                        }
                    }

                    /* ── Events ── */
                    .fc .fc-event {
                        border-radius: 4px !important;
                        padding: 1px 3px !important;
                        font-size: 0.65rem !important;
                        font-weight: 700 !important;
                        border: none !important;
                        cursor: pointer;
                    }

                    /* ── Today highlight ── */
                    .fc .fc-day-today { background: #eff6ff !important; }

                    /* ── Scrollbar ── */
                    .fc-scroller::-webkit-scrollbar { width: 4px; }
                    .fc-scroller::-webkit-scrollbar-track { background: transparent; }
                    .fc-scroller::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
                `}
            </style>

            <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/bookings')} className="p-2 hover:bg-gray-100 rounded-xl transition-colors shrink-0">
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-lg font-black text-gray-900 leading-tight">Event Calendar</h1>
                            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Schedule Overview</p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/bookings')}
                        className="shrink-0 px-3 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 shadow-md shadow-blue-100 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Add Booking</span>
                        <span className="sm:hidden">Add</span>
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-3 py-4 sm:px-4 sm:py-8">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-6">
                    {loading ? (
                        <div className="h-[60vh] flex items-center justify-center">
                            <div className="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                        </div>
                    ) : (
                        <FullCalendar
                            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                            initialView="dayGridMonth"
                            headerToolbar={{
                                left: 'prev,next today',
                                center: 'title',
                                right: 'dayGridMonth,timeGridWeek,timeGridDay'
                            }}
                            buttonText={{
                                today: 'Today',
                                month: 'Month',
                                week: 'Week',
                                day: 'Day',
                            }}
                            views={{
                                dayGridMonth: {
                                    dayMaxEventRows: 2,
                                },
                            }}
                            events={events}
                            eventClick={handleEventClick}
                            dateClick={handleDateClick}
                            height="auto"
                            contentHeight="auto"
                            handleWindowResize={true}
                            stickyHeaderDates={true}
                            eventTimeFormat={{
                                hour: 'numeric',
                                minute: '2-digit',
                                meridiem: 'short'
                            }}
                        />
                    )}
                </div>
            </main>

            {/* Event Detail Modal */}
            {selectedEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="relative h-24 bg-gradient-to-br from-blue-600 to-indigo-700 p-6">
                            <button
                                onClick={() => setSelectedEvent(null)}
                                className="absolute right-4 top-4 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white backdrop-blur-sm transition-all"
                            >
                                <X className="w-4 h-4" />
                            </button>
                            <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/20 text-white backdrop-blur-md
                                ${selectedEvent.status === 'completed' ? 'bg-green-500/20' :
                                    selectedEvent.status === 'cancelled' ? 'bg-red-500/20' :
                                        'bg-blue-500/20'}
                            `}>
                                {selectedEvent.status}
                            </span>
                        </div>

                        <div className="p-8 -mt-6 bg-white rounded-t-[2rem]">
                            <h2 className="text-2xl font-black text-gray-900 mb-1 leading-tight tracking-tight">{selectedEvent.event_name || selectedEvent.wedding_name}</h2>
                            <p className="text-blue-600 font-black text-[10px] uppercase tracking-[0.2em] mb-8">Confirmed Booking</p>

                            <div className="space-y-5">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center shrink-0">
                                        <User className="w-5 h-5 text-gray-600" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Client</p>
                                        <p className="text-sm font-bold text-gray-900">{selectedEvent.client_name || 'Walk-in'}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center shrink-0">
                                        <Clock className="w-5 h-5 text-gray-600" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Timeline</p>
                                        <p className="text-sm font-bold text-gray-900">{selectedEvent.start_time} - {selectedEvent.end_time}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center shrink-0">
                                        <MapPin className="w-5 h-5 text-gray-600" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Location</p>
                                        <p className="text-sm font-bold text-gray-900 truncate max-w-[200px]">{selectedEvent.event_place || 'Studio / Not specified'}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-green-50 flex items-center justify-center shrink-0">
                                        <IndianRupee className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Budget</p>
                                        <p className="text-sm font-black text-gray-900">₹{selectedEvent.price_quote?.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => { navigate('/bookings'); setSelectedEvent(null) }}
                                className="w-full mt-10 py-4 bg-black text-white rounded-[1.25rem] font-black text-sm uppercase tracking-widest hover:bg-gray-900 shadow-xl shadow-black/10 active:scale-95 transition-all"
                            >
                                Open Details
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
