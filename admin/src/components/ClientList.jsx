import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useNavigate } from 'react-router-dom'
import {
    ArrowLeft, UserPlus, Search, User,
    Edit2, Trash2, X, Check, Camera, Eye, EyeOff, Lock, Plus
} from 'lucide-react'
import { toast } from 'sonner'

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
)

export default function ClientList() {
    const navigate = useNavigate()
    const [clients, setClients] = useState([])
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [saving, setSaving] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState(null)
    const [deleting, setDeleting] = useState(false)
    const [search, setSearch] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [eventSearch, setEventSearch] = useState('')
    const [selectedEventIds, setSelectedEventIds] = useState(new Set())

    const [formData, setFormData] = useState({
        username: '',
        password: '',
        wedding_name: ''
    })

    useEffect(() => {
        fetchClients()
        fetchEvents()
    }, [])

    async function fetchClients() {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('client_users')
                .select('*, client_event_access(count)')
                .order('wedding_name')
            if (error) throw error
            setClients(data || [])
        } catch {
            toast.error('Failed to load clients')
        } finally {
            setLoading(false)
        }
    }

    async function fetchEvents() {
        try {
            const { data, error } = await supabase
                .from('events')
                .select('id, event_name, event_date')
                .order('event_date', { ascending: false })
            if (error) throw error
            setEvents(data || [])
        } catch {
            toast.error('Failed to load events')
        }
    }

    async function handleSubmit(e) {
        e.preventDefault()
        if (!formData.username.trim() || !formData.password.trim()) {
            toast.error('Username and password are required.')
            return
        }
        setSaving(true)
        try {
            if (editingId) {
                // Update existing
                const { error } = await supabase.from('client_users').update({
                    username: formData.username.trim(),
                    password: formData.password.trim(),
                    wedding_name: formData.wedding_name.trim()
                }).eq('id', editingId)
                if (error) throw error
                toast.success('Client updated')
            } else {
                // Create new client_user
                const { data: newUser, error: insertErr } = await supabase
                    .from('client_users')
                    .insert([{
                        username: formData.username.trim(),
                        password: formData.password.trim(),
                        wedding_name: formData.wedding_name.trim()
                    }])
                    .select()
                    .single()
                if (insertErr) throw insertErr

                // Assign events if any selected
                if (selectedEventIds.size > 0) {
                    const eventAccessRows = Array.from(selectedEventIds).map(eventId => ({
                        client_id: newUser.id,
                        event_id: eventId
                    }))
                    const { error: accessErr } = await supabase
                        .from('client_event_access')
                        .insert(eventAccessRows)
                    if (accessErr) throw accessErr
                }
                toast.success(`Client created${selectedEventIds.size > 0 ? ` with ${selectedEventIds.size} event${selectedEventIds.size !== 1 ? 's' : ''} assigned` : ''}`)
            }
            setShowForm(false)
            resetForm()
            fetchClients()
        } catch (error) {
            toast.error(error.message)
        } finally {
            setSaving(false)
        }
    }

    function resetForm() {
        setEditingId(null)
        setFormData({ username: '', password: '', wedding_name: '' })
        setShowPassword(false)
        setSelectedEventIds(new Set())
        setEventSearch('')
    }

    function handleEdit(client) {
        setEditingId(client.id)
        setFormData({
            username: client.username,
            password: client.password,
            wedding_name: client.wedding_name || ''
        })
        setShowForm(true)
    }

    function toggleEvent(id) {
        setSelectedEventIds(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    async function handleDelete() {
        if (!deleteTarget) return
        setDeleting(true)
        try {
            const { error } = await supabase.from('client_users').delete().eq('id', deleteTarget.id)
            if (error) throw error
            toast.success('Client removed')
            setDeleteTarget(null)
            fetchClients()
        } catch (error) {
            toast.error(error.message)
        } finally {
            setDeleting(false)
        }
    }

    const filteredClients = clients.filter(c =>
        c.wedding_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.username?.toLowerCase().includes(search.toLowerCase())
    )

    const filteredEvents = events.filter(ev =>
        ev.event_name?.toLowerCase().includes(eventSearch.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-[#f8f9fa]">

            {/* ── Header ── */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/photos')} className="p-2 hover:bg-gray-100 rounded-xl transition-colors shrink-0 cursor-pointer">
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-lg font-black text-gray-900 leading-tight">Photo Portal Clients</h1>
                            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Clients who can view their event photos</p>
                        </div>
                    </div>
                    <button
                        onClick={() => { resetForm(); setShowForm(true) }}
                        className="shrink-0 px-3 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 shadow-md shadow-blue-100 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                    >
                        <UserPlus className="w-4 h-4" />
                        <span className="hidden sm:inline">Add Client</span>
                        <span className="sm:hidden">Add</span>
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8 space-y-5">

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                    <input
                        type="text"
                        placeholder="Search by name or username..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
                    />
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {loading ? (
                        [...Array(8)].map((_, i) => (
                            <div key={i} className="h-36 bg-white rounded-2xl border border-gray-100 animate-pulse shadow-sm" />
                        ))
                    ) : filteredClients.length === 0 ? (
                        <div className="col-span-full bg-white rounded-2xl border border-gray-200 shadow-sm py-20 text-center">
                            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <User className="w-7 h-7 text-gray-600" />
                            </div>
                            <h3 className="font-bold text-gray-900 mb-1">
                                {search ? 'No clients match your search' : 'No clients yet'}
                            </h3>
                            <p className="text-sm text-gray-600 mb-5">
                                {search ? 'Try a different search.' : 'Add a client to give them access to view their event photos.'}
                            </p>
                            {!search && (
                                <button
                                    onClick={() => { resetForm(); setShowForm(true) }}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-all cursor-pointer"
                                >
                                    <UserPlus className="w-4 h-4" /> Add First Client
                                </button>
                            )}
                        </div>
                    ) : (
                        filteredClients.map(client => {
                            const eventCount = client.client_event_access?.[0]?.count || 0
                            return (
                                <div key={client.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden">
                                    <div className="h-1 bg-gradient-to-r from-violet-500 to-purple-600" />
                                    <div className="p-5 flex flex-col gap-3 flex-1">
                                        {/* Top row: avatar + action buttons */}
                                        <div className="flex items-start justify-between">
                                            <div className="w-10 h-10 rounded-2xl bg-violet-50 flex items-center justify-center shrink-0">
                                                <User className="w-5 h-5 text-violet-600" />
                                            </div>
                                            <div className="flex gap-1.5">
                                                <button
                                                    onClick={() => handleEdit(client)}
                                                    className="p-1.5 bg-gray-100 hover:bg-blue-100 rounded-lg text-gray-600 hover:text-blue-600 cursor-pointer transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteTarget({ id: client.id, name: client.wedding_name || client.username })}
                                                    className="p-1.5 bg-gray-100 hover:bg-red-100 rounded-lg text-gray-600 hover:text-red-500 cursor-pointer transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Client info */}
                                        <div>
                                            <h3 className="font-black text-gray-900 truncate">{client.wedding_name || client.username}</h3>
                                            <div className="space-y-1 mt-1.5">
                                                <p className="text-xs text-gray-600 flex items-center gap-1.5">
                                                    <User className="w-3 h-3 text-gray-600 shrink-0" />
                                                    <span className="truncate">{client.username}</span>
                                                </p>
                                                <p className="text-xs text-gray-600 flex items-center gap-1.5">
                                                    <Lock className="w-3 h-3 text-gray-300 shrink-0" /> ••••••••
                                                </p>
                                            </div>
                                        </div>

                                        {/* Event badge */}
                                        <div className="flex items-center gap-1.5 mt-auto">
                                            <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-full text-[10px] font-black">
                                                <Camera className="w-2.5 h-2.5" /> {eventCount} event{eventCount !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Manage Access button */}
                                    <div className="px-4 pb-4">
                                        <button
                                            onClick={() => navigate(`/clients/${client.id}`)}
                                            className="w-full py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-violet-200 active:scale-95"
                                        >
                                            <Eye className="w-3.5 h-3.5" /> Manage Access
                                        </button>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </main>

            {/* ── Add/Edit Modal ── */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col animate-in zoom-in-95 overflow-hidden">

                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
                            <div>
                                <h2 className="text-lg font-black text-gray-900">{editingId ? 'Edit Client' : 'Add New Client'}</h2>
                                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mt-0.5">Photo Portal Access</p>
                            </div>
                            <button onClick={() => { setShowForm(false); resetForm() }} className="p-2 hover:bg-gray-100 rounded-xl text-gray-600 cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                            <div className="overflow-y-auto flex-1 p-6 space-y-4">

                                {/* Name */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Client Name (Label)</label>
                                    <input
                                        type="text"
                                        value={formData.wedding_name}
                                        onChange={e => setFormData({ ...formData, wedding_name: e.target.value })}
                                        placeholder="e.g. John & Sarah Wedding"
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    />
                                </div>

                                {/* Username */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Username</label>
                                    <input
                                        type="text" required
                                        value={formData.username}
                                        onChange={e => setFormData({ ...formData, username: e.target.value })}
                                        placeholder="e.g. john_sarah"
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    />
                                    <p className="text-[10px] text-gray-600 px-1">Client uses this to sign in to the photo portal.</p>
                                </div>

                                {/* Password */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            value={formData.password}
                                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                                            placeholder="Set a password"
                                            className="w-full px-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-600 cursor-pointer">
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Assign Events — only shown when creating (not editing) */}
                                {!editingId && (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Assign Events</label>
                                            {selectedEventIds.size > 0 && (
                                                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                                    {selectedEventIds.size} selected
                                                </span>
                                            )}
                                        </div>

                                        {/* Event search */}
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
                                            <input
                                                type="text"
                                                placeholder="Search events..."
                                                value={eventSearch}
                                                onChange={e => setEventSearch(e.target.value)}
                                                className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                            />
                                        </div>

                                        {/* Event list */}
                                        <div className="max-h-44 overflow-y-auto space-y-1.5 pr-0.5">
                                            {filteredEvents.length === 0 ? (
                                                <p className="text-xs text-gray-600 text-center py-4">No events found</p>
                                            ) : filteredEvents.map(ev => {
                                                const isSelected = selectedEventIds.has(ev.id)
                                                return (
                                                    <button
                                                        key={ev.id}
                                                        type="button"
                                                        onClick={() => toggleEvent(ev.id)}
                                                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${isSelected
                                                            ? 'bg-blue-50 border-blue-300 text-blue-900'
                                                            : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                                                            }`}
                                                    >
                                                        <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                                                            }`}>
                                                            {isSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-bold truncate">{ev.event_name}</p>
                                                            <p className="text-[10px] text-gray-600">{ev.event_date}</p>
                                                        </div>
                                                        {isSelected && <Plus className="w-3.5 h-3.5 text-blue-500 rotate-45 shrink-0" />}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer buttons */}
                            <div className="flex gap-3 px-6 pb-6 pt-3 border-t border-gray-100 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => { setShowForm(false); resetForm() }}
                                    className="flex-1 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit" disabled={saving}
                                    className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-black rounded-xl shadow-md hover:bg-blue-700 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                                >
                                    {saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                                    {editingId ? 'Save Changes' : 'Create Client'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Delete Confirmation Modal ── */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 overflow-hidden">
                        <div className="h-1 bg-gradient-to-r from-red-500 to-rose-600" />
                        <div className="p-6">
                            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-6 h-6 text-red-500" />
                            </div>
                            <h2 className="text-lg font-black text-gray-900 text-center mb-1">Delete Client?</h2>
                            <p className="text-sm text-gray-600 text-center mb-1">
                                <span className="font-bold text-gray-800">{deleteTarget.name}</span> will be permanently removed.
                            </p>
                            <p className="text-xs text-gray-600 text-center mb-6">
                                They will lose access to all assigned events.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteTarget(null)}
                                    className="flex-1 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="flex-1 py-2.5 text-sm font-black text-white bg-red-500 hover:bg-red-600 rounded-xl shadow-md shadow-red-100 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70"
                                >
                                    {deleting
                                        ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                        : <><Trash2 className="w-4 h-4" /> Delete</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
