import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import { IndianRupee, ArrowLeft, User, Phone } from 'lucide-react'
import { toast } from 'sonner'

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
)

export default function PaymentStatus() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [paymentData, setPaymentData] = useState({
        totalCollected: 0,
        totalPending: 0,
        pendingClients: []
    })

    useEffect(() => {
        fetchPaymentData()
    }, [])

    async function fetchPaymentData() {
        setLoading(true)
        try {
            const { data: events, error } = await supabase
                .from('events')
                .select('*')

            if (error) throw error

            const totalCollected = events.reduce((acc, e) => acc + (e.advance_paid || 0), 0)

            const pendingClients = events
                .filter(e => {
                    const quote = e.price_quote || 0
                    const advance = e.advance_paid || 0
                    return quote > 0 && advance < quote
                })
                .map(e => ({
                    name: e.client_name || e.event_name || e.wedding_name || '—',
                    event: e.event_name || e.wedding_name || '—',
                    pending: (e.price_quote || 0) - (e.advance_paid || 0),
                    phone: e.client_phone || '—',
                }))
                .sort((a, b) => b.pending - a.pending)

            const totalPending = pendingClients.reduce((acc, c) => acc + c.pending, 0)

            setPaymentData({
                totalCollected,
                totalPending,
                pendingClients,
            })
        } catch (error) {
            toast.error('Failed to load payment data')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#f5f5f7]">
            {/* Minimal Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
                    <button
                        onClick={() => navigate('/home')}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-600 hover:text-gray-900"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                        <IndianRupee className="w-5 h-5 text-emerald-600" />
                        Payment Status
                    </h1>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-8 space-y-8 animate-in fade-in duration-500">

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm transition-all hover:border-emerald-200">
                        <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">Total Amount Collected</p>
                        <div className="text-3xl font-black text-gray-900">
                            {loading ? '...' : `₹${paymentData.totalCollected.toLocaleString()}`}
                        </div>
                    </div>
                    <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm transition-all hover:border-orange-200">
                        <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">Total Pending Amount</p>
                        <div className="text-3xl font-black text-orange-600">
                            {loading ? '...' : `₹${paymentData.totalPending.toLocaleString()}`}
                        </div>
                    </div>
                </div>

                {/* Simplified Client List */}
                <div className="space-y-4">
                    <h2 className="text-sm font-bold text-gray-600 uppercase tracking-widest px-1">Pending Clients</h2>

                    {loading ? (
                        <div className="space-y-3">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="h-20 bg-white rounded-2xl animate-pulse border border-gray-100" />
                            ))}
                        </div>
                    ) : paymentData.pendingClients.length === 0 ? (
                        <div className="bg-white py-12 px-6 rounded-3xl border border-dashed border-gray-200 text-center">
                            <p className="text-gray-600 font-medium">All payments are cleared! 🎉</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="divide-y divide-gray-100">
                                {paymentData.pendingClients.map((client, i) => (
                                    <div key={i} className="p-6 flex items-center justify-between group hover:bg-gray-50/50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            {client.phone !== '—' ? (
                                                <a
                                                    href={`tel:${client.phone}`}
                                                    className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all active:scale-95 shadow-sm"
                                                    title="Call Client"
                                                >
                                                    <Phone className="w-5 h-5" />
                                                </a>
                                            ) : (
                                                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100">
                                                    <User className="w-5 h-5 text-gray-600" />
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-bold text-gray-900">{client.name}</p>
                                                <p className="text-xs text-gray-600">{client.event}</p>
                                            </div>
                                        </div>
                                        <div className="text-right flex items-center gap-6">
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-tighter">Pending</p>
                                                <p className="text-lg font-black text-orange-600 tracking-tight">₹{client.pending.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <footer className="text-center pb-8 opacity-20">
                    <p className="text-[10px] font-bold uppercase tracking-widest">Surya Studio Financial Record</p>
                </footer>
            </main>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                .animate-in { animation: fade-in 0.4s ease-out; }
            `}} />
        </div>
    )
}
