import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useNavigate } from 'react-router-dom'
import { LogOut, Eye, ArrowRight } from 'lucide-react'
import { toast } from "sonner"

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
)

export default function Home() {
    const navigate = useNavigate()
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState(null)

    useEffect(() => {
        // Check auth
        const storedUser = localStorage.getItem('client_user')
        if (!storedUser) {
            navigate('/signin')
            return
        }
        const parsedUser = JSON.parse(storedUser)
        setUser(parsedUser)
        fetchClientEvents(parsedUser.id)
    }, [])

    async function fetchClientEvents(clientId) {
        try {
            const { data, error } = await supabase
                .from('client_event_access')
                .select(`
          event_id,
          events (
            *,
            event_images (count)
          )
        `)
                .eq('client_id', clientId)

            if (error) throw error

            // Transform data to flat event objects
            const formattedEvents = data?.map(item => item.events).filter(Boolean) || []
            setEvents(formattedEvents)
        } catch (error) {
            console.error('Error fetching events:', error)
            toast.error('Failed to load your events')
        } finally {
            setLoading(false)
        }
    }

    function handleSignOut() {
        localStorage.removeItem('client_user')
        navigate('/signin')
        toast.success('Signed out successfully')
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-gray-900 font-medium">Loading your events...</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex flex-row justify-between items-center gap-3 mb-8">
                    <div>
                        <h1 className="text-xl md:text-3xl font-bold text-gray-900">Your Events</h1>
                        <p className="text-sm md:text-base text-gray-600">Welcome, {user?.wedding_name || user?.username}</p>
                    </div>
                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-1.5 px-3 py-2 md:px-4 md:py-2 bg-white hover:bg-gray-50 text-red-600 rounded-lg border border-red-200 hover:border-red-300 transition-all font-medium text-sm cursor-pointer shrink-0"
                    >
                        <LogOut className="w-4 h-4" />
                        <span className="hidden sm:inline">Sign Out</span>
                        <span className="sm:hidden">Out</span>
                    </button>
                </div>

                {/* Events Grid */}
                {events.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                        <h3 className="text-gray-900 font-medium mb-1">No events assigned</h3>
                        <p className="text-gray-600">Contact the admin if you believe this is a mistake.</p>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {events.map((event) => (
                            <div
                                key={event.id}
                                className="group bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all cursor-pointer"
                                onClick={() => navigate(`/event/${event.id}`)}
                            >
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                            <Eye className="w-3 h-3" />
                                            {event.event_images?.[0]?.count || 0} Photos
                                        </span>
                                        <span className="text-sm text-gray-600">{event.date}</span>
                                    </div>

                                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                                        {event.wedding_name}
                                    </h3>
                                    <p className="text-sm text-gray-600 mb-4">
                                        {event.categories}
                                    </p>

                                    <div className="flex items-center text-blue-600 font-medium text-sm group-hover:translate-x-1 transition-transform">
                                        View Gallery <ArrowRight className="w-4 h-4 ml-1" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
