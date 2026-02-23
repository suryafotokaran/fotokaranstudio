import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useNavigate } from 'react-router-dom'
import {
    ArrowLeft, Plus, Edit2, Trash2, Search, Filter,
    Calendar, Clock, MapPin, IndianRupee, User,
    CheckCircle2, AlertCircle, X, Check, Eye, Phone
} from 'lucide-react'
import { toast } from 'sonner'
import { DatePicker } from './ui/date-picker'
import { TimePicker } from './ui/time-picker'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Button } from './ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "./ui/select"

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
)

const PAYMENT_METHODS = ['Cash', 'GPay', 'PhonePe', 'Paytm', 'Bank Transfer']
const STATUS_OPTIONS = ['upcoming', 'completed', 'cancelled']

const formatTime12h = (time24) => {
    if (!time24) return '—'
    const [hours, minutes] = time24.split(':')
    const h = parseInt(hours)
    const period = h >= 12 ? 'PM' : 'AM'
    const displayHour = h % 12 === 0 ? 12 : h % 12
    return `${displayHour}:${minutes} ${period}`
}

const INITIAL_FORM_STATE = {
    client_name: '',
    client_phone: '',
    event_name: '',
    event_place: '',
    event_date: '',
    start_time: '',
    end_time: '',
    price_quote: 0,
    advance_paid: 0,
    payment_method: '',
    photos_committed: 0,
    description: '',
    assistant_name: '',
    status: 'upcoming'
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

export default function BookingManager() {
    const navigate = useNavigate()
    const [bookings, setBookings] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [saving, setSaving] = useState(false)
    const [conflictWarning, setConflictWarning] = useState(null)
    const [viewBooking, setViewBooking] = useState(null)

    // Filters
    const [search, setSearch] = useState('')
    const [filterStatus, setFilterStatus] = useState('upcoming')
    const [filterAssistant, setFilterAssistant] = useState('')

    const [formData, setFormData] = useState(INITIAL_FORM_STATE)

    useEffect(() => {
        fetchData()
    }, [])

    async function fetchData() {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .order('event_date', { ascending: true })

            if (error) throw error
            setBookings(data || [])
        } catch (error) {
            toast.error('Failed to load data')
        } finally {
            setLoading(false)
        }
    }

    // Conflict detection
    useEffect(() => {
        if (formData.event_date && formData.start_time && formData.end_time) {
            const conflict = bookings.find(b =>
                b.id !== editingId &&
                b.event_date === formData.event_date &&
                b.status !== 'cancelled' &&
                ((formData.start_time < b.end_time) && (formData.end_time > b.start_time))
            )

            if (conflict) {
                setConflictWarning(`Slot already booked for "${conflict.event_name}".`)
            } else {
                setConflictWarning(null)
            }
        } else {
            setConflictWarning(null)
        }
    }, [formData.event_date, formData.start_time, formData.end_time, bookings, editingId])

    async function handleSubmit(e) {
        e.preventDefault()
        if (!formData.event_name) {
            toast.error('Booking name required.')
            return
        }
        if (formData.client_phone && formData.client_phone.length !== 10) {
            toast.error('Phone number must be exactly 10 digits.')
            return
        }
        if (conflictWarning && !formData.assistant_name) {
            toast.error('Assign an assistant for overlapping slot.')
            return
        }

        setSaving(true)
        try {
            const payload = {
                ...formData,
                wedding_name: formData.event_name,
                event_date: formData.event_date || null,
                date: formData.event_date || null,
                start_time: formData.start_time || null,
                end_time: formData.end_time || null,
                price_quote: formData.price_quote || 0,
                advance_paid: formData.advance_paid || 0
            }

            if (editingId) {
                const { error } = await supabase.from('events').update(payload).eq('id', editingId)
                if (error) throw error
                toast.success('Updated!')
            } else {
                const { error } = await supabase.from('events').insert([payload])
                if (error) throw error
                toast.success('Created!')
            }

            setShowForm(false)
            resetForm()
            fetchData()
        } catch (error) {
            toast.error(error.message)
        } finally {
            setSaving(false)
        }
    }

    function resetForm() {
        setEditingId(null)
        setFormData(INITIAL_FORM_STATE)
    }

    function handleEdit(booking) {
        setEditingId(booking.id)
        setFormData({
            client_name: booking.client_name || '',
            client_phone: booking.client_phone || '',
            event_name: booking.event_name || booking.wedding_name || '',
            event_place: booking.event_place || '',
            event_date: booking.event_date || booking.date || '',
            start_time: booking.start_time || '09:00',
            end_time: booking.end_time || '18:00',
            price_quote: booking.price_quote || 0,
            advance_paid: booking.advance_paid || 0,
            payment_method: booking.payment_method || 'Cash',
            photos_committed: booking.photos_committed || 200,
            description: booking.description || '',
            assistant_name: booking.assistant_name || '',
            status: booking.status || 'upcoming'
        })
        setShowForm(true)
    }

    async function handleDelete(id) {
        if (!confirm('Delete booking?')) return
        try {
            const { error } = await supabase.from('events').delete().eq('id', id)
            if (error) throw error
            toast.success('Deleted')
            fetchData()
        } catch (error) {
            toast.error('Failed to delete')
        }
    }

    const filteredBookings = bookings.filter(b => {
        const matchesSearch = !search ||
            b.client_name?.toLowerCase().includes(search.toLowerCase()) ||
            b.client_phone?.includes(search) ||
            b.event_name?.toLowerCase().includes(search.toLowerCase())
        const matchesStatus = filterStatus === 'All' || b.status === filterStatus
        const matchesAssistant = !filterAssistant || b.assistant_name?.toLowerCase().includes(filterAssistant.toLowerCase())
        return matchesSearch && matchesStatus && matchesAssistant
    })

    return (
        <div className="min-h-screen bg-[#f8f9fa]">
            <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/home')} className="p-2 hover:bg-gray-100 rounded-xl transition-colors shrink-0">
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <h1 className="text-xl font-black text-gray-900 leading-tight">Booking Management</h1>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                            onClick={() => navigate('/calendar')}
                            className="flex-1 sm:flex-initial px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-50 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                        >
                            <Calendar className="w-4 h-4" /> Calendar
                        </button>
                        <button
                            onClick={() => { resetForm(); setShowForm(true) }}
                            className="flex-1 sm:flex-initial px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 shadow-md shadow-blue-100 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                        >
                            <Plus className="w-4 h-4" /> New Booking
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
                {/* Filters */}
                <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4 sm:gap-6 items-stretch md:items-end">
                    <div className="flex-1 space-y-1.5">
                        <Label className="uppercase text-[10px] font-black tracking-widest text-gray-600">Search</Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                            <Input
                                placeholder="Search names, phones, events..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-9 h-11"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:flex gap-4 items-end">
                        <div className="space-y-1.5 md:w-[160px]">
                            <Label className="uppercase text-[10px] font-black tracking-widest text-gray-600">Status</Label>
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger className="h-11">
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All">All Status</SelectItem>
                                    {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5 md:w-[180px]">
                            <Label className="uppercase text-[10px] font-black tracking-widest text-gray-600">Assistant</Label>
                            <Input
                                placeholder="Assistant..."
                                value={filterAssistant}
                                onChange={e => setFilterAssistant(e.target.value)}
                                className="h-11"
                            />
                        </div>
                    </div>
                </div>

                {/* Bookings View */}
                <div className="space-y-4 sm:space-y-0">
                    {/* Desktop Table */}
                    <div className="hidden sm:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 border-b border-gray-200">
                                        <th className="px-6 py-4 text-xs font-black text-gray-700 uppercase tracking-widest">Client & Event</th>
                                        <th className="px-6 py-4 text-xs font-black text-gray-700 uppercase tracking-widest">Date & Time</th>
                                        <th className="px-6 py-4 text-xs font-black text-gray-700 uppercase tracking-widest">Payment</th>
                                        <th className="px-6 py-4 text-xs font-black text-gray-700 uppercase tracking-widest">Status</th>
                                        <th className="px-6 py-4 text-xs font-black text-gray-700 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-600 font-medium font-black uppercase tracking-widest text-xs">Loading...</td></tr>
                                    ) : filteredBookings.length === 0 ? (
                                        <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-600 font-medium font-black uppercase tracking-widest text-xs">No bookings found</td></tr>
                                    ) : (
                                        filteredBookings.map(booking => {
                                            const remaining = booking.price_quote - booking.advance_paid
                                            const isUnpaid = booking.price_quote === 0 || (booking.advance_paid === 0 && booking.price_quote > 0)
                                            const paid = remaining <= 0 && booking.price_quote > 0 ? 'fully' : (booking.advance_paid > 0 ? 'partial' : 'none')
                                            return (
                                                <tr key={booking.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="font-black text-gray-900">{booking.event_name}</div>
                                                        <div className="text-xs text-gray-600 font-bold flex items-center gap-1 mt-0.5">
                                                            <User className="w-3 h-3 text-blue-500" /> {booking.client_name}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-600">
                                                        <div className="flex items-center gap-1.5 font-bold text-gray-900"><Calendar className="w-3.5 h-3.5" /> {booking.event_date}</div>
                                                        <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-600"><Clock className="w-3.5 h-3.5" /> {formatTime12h(booking.start_time)}-{formatTime12h(booking.end_time)}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-base font-black text-gray-900">₹{booking.price_quote?.toLocaleString()}</div>
                                                        <div className={`text-xs font-black px-2.5 py-1 rounded-full inline-block mt-1.5 uppercase border 
                                                            ${paid === 'fully' ? 'bg-green-50 text-green-700 border-green-200' :
                                                                paid === 'partial' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                                                    'bg-red-50 text-red-700 border-red-200'}`}>
                                                            {paid === 'fully' ? 'Fully Paid' :
                                                                paid === 'partial' ? `Adv: ₹${booking.advance_paid?.toLocaleString()} | Pend: ₹${remaining.toLocaleString()}` :
                                                                    'Unpaid'}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border ${booking.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' : booking.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>{booking.status}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button onClick={() => setViewBooking(booking)} className="p-2 text-gray-600 hover:text-blue-600 rounded-xl hover:bg-blue-50 transition-all" title="View Details"><Eye className="w-4 h-4" /></button>
                                                            <button onClick={() => handleEdit(booking)} className="p-2 text-gray-600 hover:text-blue-600 rounded-xl hover:bg-blue-50 transition-all"><Edit2 className="w-4 h-4" /></button>
                                                            <button onClick={() => handleDelete(booking.id)} className="p-2 text-red-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-all"><Trash2 className="w-4 h-4" /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Mobile Card List */}
                    <div className="sm:hidden space-y-4">
                        {loading ? (
                            <div className="text-center py-12 text-gray-600 font-black uppercase text-[10px] tracking-widest bg-white rounded-2xl border border-gray-100">Loading...</div>
                        ) : filteredBookings.length === 0 ? (
                            <div className="text-center py-12 text-gray-600 font-black uppercase text-[10px] tracking-widest bg-white rounded-2xl border border-gray-100">No bookings found</div>
                        ) : (
                            filteredBookings.map(booking => {
                                const remaining = booking.price_quote - booking.advance_paid
                                const isUnpaid = booking.price_quote === 0 || (booking.advance_paid === 0 && booking.price_quote > 0)
                                const paid = remaining <= 0 && booking.price_quote > 0 ? 'fully' : (booking.advance_paid > 0 ? 'partial' : 'none')
                                return (
                                    <div key={booking.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap mb-3">
                                                    <div className="font-extrabold text-gray-900 text-xl truncate">{booking.event_name}</div>
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${booking.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' : booking.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>{booking.status}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-blue-50 items-center justify-center p-2 rounded-xl flex border border-blue-100"><User className="w-4 h-4 text-blue-600" /></div>
                                                    <div>
                                                        <div className="text-base font-bold text-gray-800">{booking.client_name}</div>
                                                        {booking.client_phone && (
                                                            <div className="text-xs font-bold text-gray-500 flex items-center gap-1">
                                                                <Phone className="w-3 h-3 text-gray-400" />
                                                                {booking.client_phone}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
                                            <div className="space-y-1.5 flex-1">
                                                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Schedule</div>
                                                <div className="text-sm font-black text-gray-900 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-blue-600" /> {formatDateLong(booking.event_date)}</div>
                                                <div className="text-[11px] font-bold text-gray-600 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-blue-600" /> {formatTime12h(booking.start_time)} – {formatTime12h(booking.end_time)}</div>
                                            </div>
                                            <div className="space-y-1 text-right">
                                                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Payment</div>
                                                <div className="text-base font-black text-gray-900 flex justify-end items-center gap-1"><IndianRupee className="w-3.5 h-3.5" />{booking.price_quote?.toLocaleString()}</div>
                                                <div className="flex justify-end mt-1">
                                                    <div className={`text-xs font-black px-2.5 py-1 rounded-md uppercase tracking-wider border 
                                                        ${paid === 'fully' ? 'bg-green-100 text-green-700 border-green-200' :
                                                            paid === 'partial' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                                                                'bg-red-100 text-red-700 border-red-200'}`}>
                                                        {paid === 'fully' ? 'Fully Paid' :
                                                            paid === 'partial' ? `Adv: ₹${booking.advance_paid?.toLocaleString()} | Pend: ₹${remaining.toLocaleString()}` :
                                                                'Unpaid'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 pt-2">
                                            <button onClick={() => setViewBooking(booking)} className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 p-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 transition-all"><Eye className="w-4 h-4" /> View</button>
                                            <button onClick={() => handleEdit(booking)} className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-600 p-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 transition-all"><Edit2 className="w-4 h-4" /> Edit</button>
                                            <button onClick={() => handleDelete(booking.id)} className="bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 p-3 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            </main>

            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-300">
                    <div className="bg-white h-full sm:h-auto sm:max-h-[90vh] w-full max-w-4xl sm:rounded-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-5 duration-300">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
                            <div>
                                <h2 className="text-xl font-black text-gray-900">{editingId ? 'Edit Booking' : 'New Booking'}</h2>
                                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mt-0.5">Event Management System</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setShowForm(false)} className="rounded-xl">
                                <X className="w-5 h-5 text-gray-600" />
                            </Button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 bg-white space-y-10">
                            {conflictWarning && (
                                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3 animate-in shake-in">
                                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-bold text-red-900">{conflictWarning}</p>
                                        <p className="text-xs text-red-600/70 mt-0.5 font-medium">Please assign an assistant photographer to proceed.</p>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-1.5 h-4 bg-blue-600 rounded-full" />
                                        <h3 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em]">Client & Event</h3>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-gray-600 ml-1">Client Name</Label>
                                        <Input
                                            value={formData.client_name}
                                            onChange={e => setFormData({ ...formData, client_name: e.target.value })}
                                            placeholder="Full Name"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-gray-600 ml-1">Phone Number</Label>
                                        <Input
                                            type="tel"
                                            value={formData.client_phone}
                                            onChange={e => {
                                                const val = e.target.value.replace(/\D/g, '').slice(0, 10)
                                                setFormData({ ...formData, client_phone: val })
                                            }}
                                            placeholder="10-digit mobile number"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-gray-600 ml-1">Event Name</Label>
                                        <div className="grid grid-cols-[1fr,auto] gap-2">
                                            <Input
                                                required
                                                value={formData.event_name}
                                                onChange={e => setFormData({ ...formData, event_name: e.target.value })}
                                                placeholder="e.g. Rahul & Sunita Engagement"
                                            />
                                            <div className="flex flex-col justify-center">
                                                <Label className="text-xs font-bold text-gray-600 mb-1">Status</Label>
                                                <Select
                                                    value={formData.status}
                                                    onValueChange={val => setFormData({ ...formData, status: val })}
                                                >
                                                    <SelectTrigger className="w-[140px]">
                                                        <SelectValue placeholder="Status" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {STATUS_OPTIONS.map(s => (
                                                            <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-gray-600 ml-1">Event Location</Label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 z-10" />
                                            <Input
                                                value={formData.event_place}
                                                onChange={e => setFormData({ ...formData, event_place: e.target.value })}
                                                placeholder="Location details..."
                                                className="pl-9"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-1.5 h-4 bg-violet-600 rounded-full" />
                                        <h3 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em]">Schedule & Finance</h3>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-gray-600 ml-1">Date</Label>
                                        <DatePicker
                                            value={formData.event_date}
                                            onChange={val => setFormData({ ...formData, event_date: val })}
                                            placeholder="Select date"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-gray-600 ml-1">Start Time</Label>
                                            <div className="relative">
                                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 z-10" />
                                                <TimePicker
                                                    value={formData.start_time}
                                                    onChange={val => setFormData({ ...formData, start_time: val })}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-gray-600 ml-1">End Time</Label>
                                            <div className="relative">
                                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 z-10" />
                                                <TimePicker
                                                    value={formData.end_time}
                                                    onChange={val => setFormData({ ...formData, end_time: val })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-gray-600 ml-1">Price Quote (₹)</Label>
                                            <Input
                                                type="number" min="0"
                                                value={formData.price_quote === 0 ? '' : formData.price_quote}
                                                onChange={e => setFormData({ ...formData, price_quote: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-gray-600 ml-1">Advance Paid (₹)</Label>
                                            <Input
                                                type="number" min="0"
                                                value={formData.advance_paid === 0 ? '' : formData.advance_paid}
                                                onChange={e => setFormData({ ...formData, advance_paid: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-gray-600 ml-1">Payment Method</Label>
                                            <Select value={formData.payment_method} onValueChange={val => setFormData({ ...formData, payment_method: val })}>
                                                <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                                                <SelectContent>{PAYMENT_METHODS.map(m => (<SelectItem key={m} value={m}>{m}</SelectItem>))}</SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-gray-600 ml-1">Photos Promised</Label>
                                            <Input
                                                type="number"
                                                value={formData.photos_committed === 0 ? '' : formData.photos_committed}
                                                onChange={e => setFormData({ ...formData, photos_committed: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-100">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-gray-600 ml-1 italic">Assistant Photographer</Label>
                                        <Input
                                            value={formData.assistant_name}
                                            onChange={e => setFormData({ ...formData, assistant_name: e.target.value })}
                                            placeholder="Optional (unless overlapping)"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-gray-600 ml-1">Notes / Instructions</Label>
                                        <textarea
                                            rows="3"
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="Add any specific requirements..."
                                            className="flex w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm ring-offset-white placeholder:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all resize-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-10 flex flex-col sm:flex-row items-center justify-end gap-3 shrink-0">
                                <Button type="button" variant="ghost" onClick={() => setShowForm(false)} className="w-full sm:w-auto px-10 h-12 rounded-2xl font-bold text-gray-600">Cancel</Button>
                                <Button type="submit" disabled={saving} className="w-full sm:w-auto px-12 h-12 rounded-2xl font-black bg-black hover:bg-gray-900 text-white shadow-xl shadow-black/10 active:scale-95 transition-all text-base">
                                    {saving ? <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : (
                                        <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> {editingId ? 'Update Booking' : 'Create Booking'}</div>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── View Booking Modal ── */}
            {viewBooking && (() => {
                const b = viewBooking
                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-300" onClick={() => setViewBooking(null)}>
                        <div className="bg-white h-full sm:h-auto sm:max-h-[90vh] w-full max-w-4xl sm:rounded-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-5 duration-300" onClick={e => e.stopPropagation()}>
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
                                <div>
                                    <h2 className="text-xl font-black text-gray-900">View Booking</h2>
                                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mt-0.5">Read Only</p>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setViewBooking(null)} className="rounded-xl">
                                    <X className="w-5 h-5 text-gray-600" />
                                </Button>
                            </div>

                            <div className="p-6 overflow-y-auto flex-1 bg-white space-y-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                                    {/* Left — Client & Event */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-1.5 h-4 bg-blue-600 rounded-full" />
                                            <h3 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em]">Client &amp; Event</h3>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-gray-600 ml-1">Client Name</Label>
                                            <Input disabled value={b.client_name || ''} />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-gray-600 ml-1">Phone Number</Label>
                                            <Input disabled value={b.client_phone || ''} />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-gray-600 ml-1">Event Name</Label>
                                            <div className="grid grid-cols-[1fr,auto] gap-2">
                                                <Input disabled value={b.event_name || b.wedding_name || ''} />
                                                <div className="flex flex-col justify-center">
                                                    <Label className="text-xs font-bold text-gray-600 mb-1">Status</Label>
                                                    <div className={`h-10 px-4 rounded-xl border text-xs font-black uppercase flex items-center ${b.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' : b.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                                        {b.status}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-gray-600 ml-1">Event Location</Label>
                                            <div className="relative">
                                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 z-10" />
                                                <Input disabled value={b.event_place || ''} className="pl-9" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right — Schedule & Finance */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-1.5 h-4 bg-violet-600 rounded-full" />
                                            <h3 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em]">Schedule &amp; Finance</h3>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-gray-600 ml-1">Date</Label>
                                            <Input disabled value={b.event_date || b.date || ''} />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-gray-600 ml-1">Start Time</Label>
                                                <div className="relative">
                                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 z-10" />
                                                    <Input disabled value={formatTime12h(b.start_time)} className="pl-9" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-gray-600 ml-1">End Time</Label>
                                                <div className="relative">
                                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 z-10" />
                                                    <Input disabled value={formatTime12h(b.end_time)} className="pl-9" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-gray-600 ml-1">Price Quote (₹)</Label>
                                                <Input disabled value={b.price_quote ?? ''} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-gray-600 ml-1">Advance Paid (₹)</Label>
                                                <Input disabled value={b.advance_paid ?? ''} />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-gray-600 ml-1">Payment Method</Label>
                                                <Input disabled value={b.payment_method || ''} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-gray-600 ml-1">Photos Promised</Label>
                                                <Input disabled value={b.photos_committed ?? ''} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom row */}
                                <div className="pt-6 border-t border-gray-100">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-gray-600 ml-1 italic">Assistant Photographer</Label>
                                            <Input disabled value={b.assistant_name || ''} placeholder="—" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-gray-600 ml-1">Notes / Instructions</Label>
                                            <textarea
                                                rows="3"
                                                disabled
                                                value={b.description || ''}
                                                className="flex w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 placeholder:text-gray-600 disabled:cursor-not-allowed disabled:opacity-70 transition-all resize-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex flex-col sm:flex-row items-center justify-end gap-3">
                                    <Button type="button" variant="ghost" onClick={() => setViewBooking(null)} className="w-full sm:w-auto px-10 h-12 rounded-2xl font-bold text-gray-600">Close</Button>
                                    <Button type="button" onClick={() => { setViewBooking(null); handleEdit(b) }} className="w-full sm:w-auto px-12 h-12 rounded-2xl font-black bg-black hover:bg-gray-900 text-white shadow-xl shadow-black/10 active:scale-95 transition-all text-base">
                                        <div className="flex items-center gap-2"><Edit2 className="w-5 h-5" /> Edit Booking</div>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            })()}
        </div>
    )
}
