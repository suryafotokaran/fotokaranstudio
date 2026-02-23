import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import {
    Camera, Globe, CheckSquare, LogOut, ChevronRight,
    Calendar, IndianRupee, Clock, Users, BookOpen, AlertCircle,
    X, TrendingUp, Phone, User
} from 'lucide-react'
import { toast } from 'sonner'

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
)

export default function Dashboard() {
    const navigate = useNavigate()
    const [stats, setStats] = useState({
        monthlyEvents: 0,
        upcomingCount: 0
    })
    const [paymentData, setPaymentData] = useState({
        total: 0,
        monthly: 0,
        yearly: 0,
        pendingClients: []
    })
    const [todayEvents, setTodayEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [showSignOutConfirm, setShowSignOutConfirm] = useState(false)
    const [signingOut, setSigningOut] = useState(false)

    useEffect(() => {
        fetchDashboardData()
    }, [])

    async function fetchDashboardData() {
        setLoading(true)
        try {
            const now = new Date()
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
            const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
            const firstDayOfYear = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
            const lastDayOfYear = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0]
            const today = now.toISOString().split('T')[0]

            const { data: events, error } = await supabase
                .from('events')
                .select('*')

            if (error) throw error

            const monthly = events.filter(e => {
                const date = e.event_date || e.date
                return date >= firstDayOfMonth && date <= lastDayOfMonth
            })

            const yearly = events.filter(e => {
                const date = e.event_date || e.date
                return date >= firstDayOfYear && date <= lastDayOfYear
            })

            const upcoming = events.filter(e => e.status === 'upcoming')
            const todayList = events.filter(e => (e.event_date || e.date) === today)

            // Payment calculations
            const totalRevenue = events.reduce((acc, e) => acc + (e.price_quote || 0), 0)
            const monthlyRevenue = monthly.reduce((acc, e) => acc + (e.price_quote || 0), 0)
            const yearlyRevenue = yearly.reduce((acc, e) => acc + (e.price_quote || 0), 0)

            // Pending clients: those who have a price_quote but balance remaining > 0
            const pendingClients = events
                .filter(e => {
                    const quote = e.price_quote || 0
                    const advance = e.advance_paid || 0
                    return quote > 0 && advance < quote
                })
                .map(e => ({
                    name: e.client_name || e.event_name || e.wedding_name || '—',
                    phone: e.client_phone || '—',
                    event: e.event_name || e.wedding_name || '—',
                    pending: (e.price_quote || 0) - (e.advance_paid || 0),
                    total: e.price_quote || 0,
                    advance: e.advance_paid || 0,
                }))
                .sort((a, b) => b.pending - a.pending)

            setStats({
                monthlyEvents: monthly.length,
                upcomingCount: upcoming.length,
            })
            setPaymentData({
                total: totalRevenue,
                monthly: monthlyRevenue,
                yearly: yearlyRevenue,
                pendingClients,
            })
            setTodayEvents(todayList)
        } catch (error) {
            toast.error('Failed to load dashboard stats')
        } finally {
            setLoading(false)
        }
    }

    async function handleSignOut() {
        setSigningOut(true)
        await supabase.auth.signOut()
        navigate('/signin')
    }

    const sections = [
        {
            id: 'bookings',
            icon: BookOpen,
            title: 'Booking Management',
            description: 'Manage bookings, payments, schedules, and clients.',
            color: 'from-blue-500 to-indigo-600',
            bg: 'bg-blue-50',
            border: 'border-blue-200',
            iconBg: 'bg-blue-100 text-blue-600',
            badge: 'New',
            badgeColor: 'bg-blue-100 text-blue-700',
            route: '/bookings',
        },
        {
            id: 'photos',
            icon: Camera,
            title: 'Photo Management',
            description: 'Create events, upload photos, manage client selections.',
            color: 'from-violet-500 to-purple-600',
            bg: 'bg-violet-50',
            border: 'border-violet-200',
            iconBg: 'bg-violet-100 text-violet-600',
            badge: 'Active',
            badgeColor: 'bg-green-100 text-green-700',
            route: '/photos',
        },
        {
            id: 'website',
            icon: Globe,
            title: 'Website Management',
            description: 'Manage your public website content, categories, and banners.',
            color: 'from-amber-500 to-orange-500',
            bg: 'bg-amber-50',
            border: 'border-amber-200',
            iconBg: 'bg-amber-100 text-amber-600',
            badge: 'Active',
            badgeColor: 'bg-amber-100 text-amber-700',
            route: '/website',
        },
    ]

    const totalPending = paymentData.pendingClients.reduce((acc, c) => acc + c.pending, 0)

    return (
        <div className="min-h-screen bg-[#f5f5f7]">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-20">
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-black rounded-xl">
                            <Globe className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Studio Admin</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Payment Status Button */}
                        <button
                            onClick={() => navigate('/payments')}
                            className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-xl border border-green-200 hover:border-green-300 transition-all text-sm font-medium cursor-pointer"
                        >
                            <IndianRupee className="w-4 h-4" />
                            <span className="hidden sm:inline">Payment Status</span>
                        </button>
                        <button
                            onClick={() => setShowSignOutConfirm(true)}
                            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl border border-gray-200 hover:border-red-200 transition-all text-sm font-medium cursor-pointer"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="hidden sm:inline">Sign Out</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
                {/* Stats Grid — only non-payment stats */}
                <div className="grid grid-cols-2 gap-4">
                    {[
                        { label: 'Events this month', value: stats.monthlyEvents, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
                        { label: 'Upcoming Events', value: stats.upcomingCount, icon: Clock, color: 'text-violet-600', bg: 'bg-violet-50' },
                    ].map((stat, i) => (
                        <div key={i} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                            <div className={`w-8 h-8 ${stat.bg} ${stat.color} rounded-lg flex items-center justify-center mb-3`}>
                                <stat.icon className="w-4 h-4" />
                            </div>
                            <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">{stat.label}</p>
                            <p className="text-xl font-black text-gray-900 mt-1">{loading ? '...' : stat.value}</p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Management Sections */}
                    <div className="lg:col-span-2 space-y-4">
                        <h2 className="text-sm font-bold text-gray-600 uppercase tracking-widest px-1">Management Hub</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {sections.map((section) => {
                                const Icon = section.icon
                                return (
                                    <div
                                        key={section.id}
                                        onClick={() => navigate(section.route)}
                                        className="relative group rounded-2xl border border-gray-200 p-6 transition-all duration-200 flex flex-col gap-4 bg-white cursor-pointer hover:shadow-lg hover:border-gray-300"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className={`p-3 rounded-xl ${section.iconBg}`}>
                                                <Icon className="w-6 h-6" />
                                            </div>
                                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-tighter ${section.badgeColor}`}>
                                                {section.badge}
                                            </span>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900 mb-1">{section.title}</h3>
                                            <p className="text-sm text-gray-600 leading-relaxed font-medium">{section.description}</p>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs font-bold text-blue-600 group-hover:gap-2 transition-all mt-auto uppercase">
                                            Manage <ChevronRight className="w-4 h-4" />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Today's Events */}
                    <div className="space-y-4">
                        <h2 className="text-sm font-bold text-gray-600 uppercase tracking-widest px-1">Today's Schedule</h2>
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 h-full min-h-[300px]">
                            {loading ? (
                                <div className="space-y-3">
                                    <div className="h-16 bg-gray-50 rounded-xl animate-pulse" />
                                    <div className="h-16 bg-gray-50 rounded-xl animate-pulse" />
                                </div>
                            ) : todayEvents.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full py-10 opacity-40">
                                    <Calendar className="w-10 h-10 mb-2" />
                                    <p className="text-sm font-bold">No events today</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {todayEvents.map(event => (
                                        <div key={event.id} className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                                            <p className="text-xs font-bold text-blue-600 uppercase mb-1">{event.start_time} - {event.end_time}</p>
                                            <p className="text-sm font-bold text-gray-900 truncate">{event.event_name || event.wedding_name}</p>
                                            <p className="text-xs text-blue-600/60 font-medium">
                                                {event.client_name ? `${event.client_name} • ` : ''}
                                                {event.event_place || event.place}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <button
                                onClick={() => navigate('/calendar')}
                                className="w-full mt-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 transition-colors uppercase"
                            >
                                View full calendar
                            </button>
                        </div>
                    </div>
                </div>
            </main>


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
