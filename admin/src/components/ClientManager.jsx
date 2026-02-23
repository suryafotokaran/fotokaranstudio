import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useParams, useNavigate } from 'react-router-dom'
import {
    ArrowLeft, User, Lock, Eye, EyeOff, Check,
    X, Calendar, Plus, Trash2, Search, Loader, Copy
} from 'lucide-react'
import { toast } from 'sonner'

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
)

export default function ClientManager() {
    const { id } = useParams()          // client_users.id
    const navigate = useNavigate()

    const [clientUser, setClientUser] = useState(null)
    const [events, setEvents] = useState([])
    const [assignedEventIds, setAssignedEventIds] = useState(new Set())
    const [loading, setLoading] = useState(true)

    // Edit credentials state
    const [editingCreds, setEditingCreds] = useState(false)
    const [credsForm, setCredsForm] = useState({ username: '', password: '', wedding_name: '' })
    const [showPassword, setShowPassword] = useState(false)
    const [savingCreds, setSavingCreds] = useState(false)

    // Event search
    const [eventSearch, setEventSearch] = useState('')
    const [assigningId, setAssigningId] = useState(null)
    const [removingId, setRemovingId] = useState(null)

    useEffect(() => { loadAll() }, [id])

    async function loadAll() {
        setLoading(true)
        try {
            // Load client_users row
            const { data: cu, error: cuErr } = await supabase
                .from('client_users')
                .select('*')
                .eq('id', id)
                .single()
            if (cuErr) throw cuErr
            setClientUser(cu)
            setCredsForm({ username: cu.username, password: cu.password, wedding_name: cu.wedding_name || '' })

            // Load all events
            const { data: eventsData, error: eventsErr } = await supabase
                .from('events')
                .select('id, event_name, event_date, client_name')
                .order('event_date', { ascending: false })
            if (eventsErr) throw eventsErr
            setEvents(eventsData || [])

            // Load assigned events
            const { data: accessData, error: accessErr } = await supabase
                .from('client_event_access')
                .select('event_id')
                .eq('client_id', id)
            if (accessErr) throw accessErr
            setAssignedEventIds(new Set((accessData || []).map(a => a.event_id)))
        } catch (err) {
            toast.error('Failed to load client: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    // ── Save credentials edit ─────────────────────────────────────────
    async function handleSaveCreds(e) {
        e.preventDefault()
        if (!credsForm.username.trim() || !credsForm.password.trim()) {
            toast.error('Username and password are required')
            return
        }
        setSavingCreds(true)
        try {
            const { data, error } = await supabase
                .from('client_users')
                .update({
                    username: credsForm.username.trim(),
                    password: credsForm.password.trim(),
                    wedding_name: credsForm.wedding_name.trim()
                })
                .eq('id', id)
                .select()
                .single()
            if (error) throw error
            setClientUser(data)
            setEditingCreds(false)
            toast.success('Credentials updated!')
        } catch (err) {
            toast.error(err.message)
        } finally {
            setSavingCreds(false)
        }
    }

    // ── Event access ──────────────────────────────────────────────────
    async function handleAssign(eventId) {
        setAssigningId(eventId)
        try {
            const { error } = await supabase
                .from('client_event_access')
                .insert([{ client_id: id, event_id: eventId }])
            if (error) throw error
            setAssignedEventIds(prev => new Set([...prev, eventId]))
            toast.success('Event assigned!')
        } catch (err) {
            toast.error(err.message)
        } finally {
            setAssigningId(null)
        }
    }

    async function handleRemove(eventId) {
        setRemovingId(eventId)
        try {
            const { error } = await supabase
                .from('client_event_access')
                .delete()
                .eq('client_id', id)
                .eq('event_id', eventId)
            if (error) throw error
            setAssignedEventIds(prev => {
                const next = new Set(prev)
                next.delete(eventId)
                return next
            })
            toast.success('Event removed')
        } catch (err) {
            toast.error(err.message)
        } finally {
            setRemovingId(null)
        }
    }

    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => toast.success('Copied!'))
    }

    const filteredEvents = events.filter(ev =>
        ev.event_name?.toLowerCase().includes(eventSearch.toLowerCase())
    )

    const assignedEvents = filteredEvents.filter(ev => assignedEventIds.has(ev.id))
    const unassignedEvents = filteredEvents.filter(ev => !assignedEventIds.has(ev.id))

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
                <Loader className="w-6 h-6 animate-spin text-violet-600" />
            </div>
        )
    }

    if (!clientUser) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
                <div className="text-center">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Client not found</h2>
                    <button onClick={() => navigate('/clients')} className="text-violet-600 font-semibold hover:underline cursor-pointer">← Back to Clients</button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#f8f9fa]">

            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
                    <button onClick={() => navigate('/clients')} className="p-2 hover:bg-gray-100 rounded-xl transition-colors shrink-0 cursor-pointer">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-xl font-black text-gray-900 leading-tight truncate">
                            {clientUser.wedding_name || clientUser.username}
                        </h1>
                        <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">
                            {assignedEventIds.size} event{assignedEventIds.size !== 1 ? 's' : ''} assigned
                        </p>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6">

                {/* ── CREDENTIALS SECTION ── */}
                <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
                                <User className="w-5 h-5 text-violet-600" />
                            </div>
                            <div>
                                <h2 className="font-black text-gray-900">Login Credentials</h2>
                                <p className="text-sm text-gray-600 mt-0.5 font-medium">Client uses these to sign in to the photo portal</p>
                            </div>
                        </div>
                        {!editingCreds && (
                            <button
                                onClick={() => setEditingCreds(true)}
                                className="text-xs font-bold text-violet-600 hover:text-violet-700 cursor-pointer px-3 py-1.5 hover:bg-violet-50 rounded-xl transition-all"
                            >
                                Edit
                            </button>
                        )}
                    </div>

                    <div className="p-6">
                        {!editingCreds ? (
                            // ── View mode ──
                            <div className="grid sm:grid-cols-3 gap-3">
                                <CredCard
                                    label="Name / Label"
                                    value={clientUser.wedding_name || '—'}
                                    onCopy={clientUser.wedding_name ? () => copyToClipboard(clientUser.wedding_name) : null}
                                />
                                <CredCard
                                    label="Username"
                                    value={clientUser.username}
                                    mono
                                    onCopy={() => copyToClipboard(clientUser.username)}
                                />
                                <CredCard
                                    label="Password"
                                    value={clientUser.password}
                                    mono
                                    secret
                                    onCopy={() => copyToClipboard(clientUser.password)}
                                />
                            </div>
                        ) : (
                            // ── Edit mode ──
                            <form onSubmit={handleSaveCreds} className="space-y-4">
                                <div className="grid sm:grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-black text-gray-600 uppercase tracking-widest">Name / Label</label>
                                        <input
                                            type="text"
                                            value={credsForm.wedding_name}
                                            onChange={e => setCredsForm({ ...credsForm, wedding_name: e.target.value })}
                                            placeholder="e.g. John & Sarah"
                                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-black text-gray-600 uppercase tracking-widest">Username</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                            <input
                                                type="text"
                                                required
                                                value={credsForm.username}
                                                onChange={e => setCredsForm({ ...credsForm, username: e.target.value })}
                                                placeholder="username"
                                                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500 transition-all font-mono"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-black text-gray-600 uppercase tracking-widest">Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                required
                                                value={credsForm.password}
                                                onChange={e => setCredsForm({ ...credsForm, password: e.target.value })}
                                                placeholder="password"
                                                className="w-full pl-9 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500 transition-all font-mono"
                                            />
                                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-600 cursor-pointer">
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="submit"
                                        disabled={savingCreds}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white text-sm font-black rounded-xl hover:bg-violet-700 cursor-pointer disabled:opacity-60 transition-all"
                                    >
                                        {savingCreds ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                        Save
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setEditingCreds(false); setCredsForm({ username: clientUser.username, password: clientUser.password, wedding_name: clientUser.wedding_name || '' }) }}
                                        className="px-4 py-2 bg-gray-100 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-200 cursor-pointer transition-all flex items-center gap-1.5"
                                    >
                                        <X className="w-4 h-4" /> Cancel
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </section>

                {/* ── EVENT ACCESS SECTION ── */}
                <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="font-black text-gray-900">Event Access</h2>
                            <p className="text-xs text-gray-600 mt-0.5">
                                {assignedEventIds.size} event{assignedEventIds.size !== 1 ? 's' : ''} assigned to this client
                            </p>
                        </div>
                    </div>

                    <div className="p-6 space-y-4">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                            <input
                                type="text"
                                placeholder="Search events..."
                                value={eventSearch}
                                onChange={e => setEventSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            />
                        </div>

                        {/* Assigned events */}
                        {assignedEvents.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Assigned</p>
                                {assignedEvents.map(ev => (
                                    <EventRow
                                        key={ev.id}
                                        event={ev}
                                        assigned
                                        loading={removingId === ev.id}
                                        onAction={() => handleRemove(ev.id)}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Unassigned events */}
                        {unassignedEvents.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
                                    {assignedEvents.length > 0 ? 'Other Events' : 'All Events'}
                                </p>
                                {unassignedEvents.map(ev => (
                                    <EventRow
                                        key={ev.id}
                                        event={ev}
                                        assigned={false}
                                        loading={assigningId === ev.id}
                                        onAction={() => handleAssign(ev.id)}
                                    />
                                ))}
                            </div>
                        )}

                        {filteredEvents.length === 0 && (
                            <div className="text-center py-8 text-gray-600">
                                <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                <p className="text-sm font-medium">No events found</p>
                            </div>
                        )}
                    </div>
                </section>

            </main>
        </div>
    )
}

// ── Sub-components ──────────────────────────────────────────────────

function CredCard({ label, value, mono, secret, onCopy }) {
    const [show, setShow] = useState(!secret)

    return (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-black text-gray-600 uppercase tracking-widest mb-1.5">{label}</p>
            <div className="flex items-center justify-between gap-2">
                <span className={`text-sm font-bold text-gray-900 truncate ${mono ? 'font-mono' : ''}`}>
                    {secret ? (show ? value : '••••••••') : value}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                    {secret && (
                        <button
                            onClick={() => setShow(!show)}
                            className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-600 hover:text-gray-600 cursor-pointer transition-colors"
                        >
                            {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                    )}
                    {onCopy && (!secret || show) && (
                        <button
                            onClick={onCopy}
                            className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-600 hover:text-gray-600 cursor-pointer transition-colors"
                            title="Copy"
                        >
                            <Copy className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

function EventRow({ event, assigned, loading, onAction }) {
    return (
        <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${assigned ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex-1 min-w-0">
                {event.client_name && <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest truncate mb-0.5">{event.client_name}</p>}
                <p className="font-bold text-gray-900 text-sm truncate">{event.event_name}</p>
                <p className="text-xs text-gray-600 truncate">{event.event_date}</p>
            </div>
            <button
                onClick={onAction}
                disabled={loading}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 ${assigned
                    ? 'bg-white border border-red-200 text-red-500 hover:bg-red-50'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-100'
                    }`}
            >
                {loading
                    ? <Loader className="w-3.5 h-3.5 animate-spin" />
                    : assigned
                        ? <><Trash2 className="w-3.5 h-3.5" />Remove</>
                        : <><Plus className="w-3.5 h-3.5" />Assign</>
                }
            </button>
        </div>
    )
}
