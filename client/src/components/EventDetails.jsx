import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import { ArrowLeft, Calendar, Tag, Image as ImageIcon, Heart, X, Loader, Filter, CheckSquare, Square, Trash2, MinusCircle, Maximize2, Eye, ChevronLeft, ChevronRight, FileImage } from 'lucide-react'
import { toast } from 'sonner'

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
)

// Extensions browsers cannot render as <img>
const RAW_EXTS = new Set(['raw', 'cr2', 'nef', 'arw', 'dng', 'heic', 'heif'])
function isRawUrl(url) {
    const ext = (url || '').split('?')[0].split('.').pop().toLowerCase()
    return RAW_EXTS.has(ext)
}
function getExtLabel(url) {
    return (url || '').split('?')[0].split('.').pop().toUpperCase()
}

// Renders either a normal img or a RAW placeholder
function PhotoTile({ url, className, onClick, style }) {
    if (isRawUrl(url)) {
        return (
            <div
                className={`${className} flex flex-col items-center justify-center bg-gray-900 text-white cursor-pointer select-none`}
                onClick={onClick}
                style={style}
            >
                <FileImage className="w-8 h-8 mb-1 text-gray-600" />
                <span className="text-[10px] font-bold tracking-widest text-gray-600">{getExtLabel(url)}</span>
                <span className="text-[9px] text-gray-600 mt-0.5">RAW File</span>
            </div>
        )
    }
    return (
        <img
            src={url}
            alt="Event"
            className={className}
            loading="lazy"
            onClick={onClick}
            draggable="false"
            onDragStart={(e) => e.preventDefault()}
            style={style}
        />
    )
}

export default function EventDetails() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [event, setEvent] = useState(null)
    const [images, setImages] = useState([])
    const [loading, setLoading] = useState(true)
    const [imageUpdateLoading, setImageUpdateLoading] = useState(null) // Track which image is updating
    const [filterStatus, setFilterStatus] = useState('all') // 'all', 'selected'
    const [bulkUpdating, setBulkUpdating] = useState(false)
    const [viewingImage, setViewingImage] = useState(null)

    useEffect(() => {
        // Check auth and access
        const storedUser = localStorage.getItem('client_user')
        if (!storedUser) {
            navigate('/signin')
            return
        }
        const user = JSON.parse(storedUser)
        checkAccessAndFetch(user.id)
    }, [id])

    async function checkAccessAndFetch(clientId) {
        try {
            // 1. Verify access
            const { data: access, error: accessError } = await supabase
                .from('client_event_access')
                .select('event_id')
                .eq('client_id', clientId)
                .eq('event_id', id)
                .single()

            if (accessError || !access) {
                toast.error('You do not have access to this event')
                navigate('/home')
                return
            }

            // 2. Fetch event details
            const { data: eventData, error: eventError } = await supabase
                .from('events')
                .select('*')
                .eq('id', id)
                .single()

            if (eventError) throw eventError
            setEvent(eventData)

            // 3. Fetch images
            const { data: imagesData, error: imagesError } = await supabase
                .from('event_images')
                .select('*')
                .eq('event_id', id)
                .order('created_at', { ascending: false })

            if (imagesError) throw imagesError
            setImages(imagesData || [])

        } catch (error) {
            console.error('Error loading event:', error)
            toast.error('Failed to load event details')
        } finally {
            setLoading(false)
        }
    }

    async function toggleStatus(imageId, currentStatus, newStatus) {
        // If clicking the same status, toggle it off to 'none'
        const statusToSet = currentStatus === newStatus ? 'none' : newStatus

        setImageUpdateLoading(imageId)

        try {
            const { error } = await supabase
                .from('event_images')
                .update({ status: statusToSet })
                .eq('id', imageId)

            if (error) throw error

            // Update local state
            setImages(prev => prev.map(img =>
                img.id === imageId ? { ...img, status: statusToSet } : img
            ))

        } catch (error) {
            console.error('Error updating status:', error)
            toast.error('Failed to update image selection')
        } finally {
            setImageUpdateLoading(null)
        }
    }

    async function bulkUpdateStatus(targetStatus, currentStatusFilter = null) {
        // Collect IDs to update
        // If currentStatusFilter is provided, only update images matching that filter
        // e.g. "Clear Selection" -> update 'selected' to 'none'

        const imagesToUpdate = images.filter(img => {
            if (currentStatusFilter) return img.status === currentStatusFilter
            return true
        })

        if (imagesToUpdate.length === 0) return

        const ids = imagesToUpdate.map(img => img.id)
        setBulkUpdating(true)
        const toastId = toast.loading(`Updating ${ids.length} images...`)

        try {
            const { error } = await supabase
                .from('event_images')
                .update({ status: targetStatus })
                .in('id', ids)

            if (error) throw error

            setImages(prev => prev.map(img =>
                ids.includes(img.id) ? { ...img, status: targetStatus } : img
            ))
            toast.success('Updated successfully', { id: toastId })
        } catch (error) {
            console.error('Bulk update error:', error)
            toast.error('Failed to update images', { id: toastId })
        } finally {
            setBulkUpdating(false)
        }
    }

    // Filter Logic
    const filteredImages = images.filter(img => {
        if (filterStatus === 'all') return true
        if (filterStatus === 'selected') return img.status === 'selected'
        return true
    })

    // Keyboard support for fullscreen viewer
    useEffect(() => {
        if (!viewingImage) return

        const handleKey = (e) => {
            if (e.code === 'Space') {
                e.preventDefault()
                const currentImg = images.find(img => img.id === viewingImage.id) || viewingImage
                toggleStatus(viewingImage.id, currentImg.status, 'selected')
            }
            if (e.key === 'ArrowRight') {
                const currentIndex = filteredImages.findIndex(img => img.id === viewingImage.id)
                const nextIdx = (currentIndex + 1) % filteredImages.length
                setViewingImage(filteredImages[nextIdx])
            }
            if (e.key === 'ArrowLeft') {
                const currentIndex = filteredImages.findIndex(img => img.id === viewingImage.id)
                const prevIdx = (currentIndex - 1 + filteredImages.length) % filteredImages.length
                setViewingImage(filteredImages[prevIdx])
            }
            if (e.key === 'Escape') setViewingImage(null)
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [viewingImage, images, filteredImages])

    // Calculate stats
    const selectedCount = images.filter(img => img.status === 'selected').length
    const pendingCount = images.filter(img => img.status === 'none').length

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-gray-900 font-medium flex items-center gap-2">
                    <Loader className="w-5 h-5 animate-spin" />
                    Loading gallery...
                </div>
            </div>
        )
    }

    if (!event) return null

    return (
        <div
            className="min-h-screen bg-gray-50 p-4 md:p-6 pb-24 select-none"
            onContextMenu={(e) => e.preventDefault()}
        >
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 bg-white hover:bg-gray-100 text-gray-600 rounded-lg border border-gray-200 transition-all cursor-pointer"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>

                    <div className="flex-1 w-full">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                                    {event.wedding_name}
                                </h1>
                                <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-gray-600">
                                    <span className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-full border border-gray-200">
                                        <Calendar className="w-3.5 h-3.5 text-gray-600" />
                                        {event.date}
                                    </span>
                                    <span className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-full border border-gray-200">
                                        <Tag className="w-3.5 h-3.5 text-gray-600" />
                                        {event.event_type}
                                    </span>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="flex items-center gap-3">
                                <div className="bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center min-w-[80px]">
                                    <span className="text-xs text-gray-600 uppercase font-semibold">Total</span>
                                    <span className="text-xl font-bold text-gray-900">{images.length}</span>
                                </div>
                                <div className="bg-green-50 px-4 py-2 rounded-xl border border-green-100 flex flex-col items-center min-w-[80px]">
                                    <span className="text-xs text-green-600 uppercase font-semibold">Selected</span>
                                    <span className="text-xl font-bold text-green-700">{selectedCount}</span>
                                </div>
                                <div className="bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 flex flex-col items-center min-w-[80px]">
                                    <span className="text-xs text-gray-600 uppercase font-semibold">Pending</span>
                                    <span className="text-xl font-bold text-gray-600">{pendingCount}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sticky Toolbar */}
                <div className="sticky top-0 z-20 bg-gray-50/95 backdrop-blur-sm py-2 mb-2 md:py-4 md:mb-4 -mx-3 px-3 md:mx-0 md:px-0">
                    <div className="bg-white p-2 md:p-3 rounded-xl md:rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 md:gap-4">
                        {/* Tabs */}
                        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto hide-scrollbar pb-1 sm:pb-0">
                            <button
                                onClick={() => setFilterStatus('all')}
                                className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${filterStatus === 'all'
                                    ? 'bg-gray-900 text-white shadow-md'
                                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                All ({images.length})
                            </button>
                            <button
                                onClick={() => setFilterStatus('selected')}
                                className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1.5 md:gap-2 cursor-pointer ${filterStatus === 'selected'
                                    ? 'bg-green-500 text-white shadow-md'
                                    : 'bg-green-50 text-green-700 hover:bg-green-100'
                                    }`}
                            >
                                <Heart className={`w-3.5 h-3.5 md:w-4 md:h-4 ${filterStatus === 'selected' ? 'fill-current' : ''}`} />
                                Selected ({selectedCount})
                            </button>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 border-gray-100 pt-2 sm:pt-0">
                            {filterStatus === 'selected' && selectedCount > 0 && (
                                <button
                                    onClick={() => bulkUpdateStatus('none', 'selected')}
                                    disabled={bulkUpdating}
                                    className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-1.5 ml-auto sm:ml-0 cursor-pointer"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Clear Selection
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Gallery Grid */}
                {filteredImages.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-200 p-8 md:p-12 text-center">
                        <div className="flex justify-center mb-4">
                            <div className="p-3 md:p-4 bg-gray-50 rounded-full">
                                {filterStatus === 'selected' ? (
                                    <Heart className="w-6 h-6 md:w-8 md:h-8 text-gray-300" />
                                ) : (
                                    <ImageIcon className="w-6 h-6 md:w-8 md:h-8 text-gray-300" />
                                )}
                            </div>
                        </div>
                        <h3 className="text-gray-900 font-medium mb-1">
                            {filterStatus === 'all'
                                ? 'No photos yet'
                                : 'No selected photos'}
                        </h3>
                        <p className="text-gray-600 text-sm">
                            {filterStatus === 'all'
                                ? 'Photos will appear here once uploaded.'
                                : 'Tap the heart icon on photos to select them.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
                        {filteredImages.map((img) => {
                            const isSelected = img.status === 'selected'
                            const isRejected = img.status === 'rejected'
                            const isLoading = imageUpdateLoading === img.id

                            return (
                                <div
                                    key={img.id}
                                    className={`group relative aspect-square bg-gray-100 rounded-xl overflow-hidden border transition-all duration-300 ${isSelected
                                        ? 'border-green-500 ring-2 md:ring-4 ring-green-500/20'
                                        : isRejected
                                            ? 'border-red-500 opacity-75 grayscale'
                                            : 'border-gray-200 hover:border-blue-400'
                                        }`}
                                >
                                    <PhotoTile
                                        url={img.image_url}
                                        className="w-full h-full object-cover cursor-zoom-in"
                                        onClick={() => setViewingImage(img)}
                                    />

                                    {/* Full View Icon - Visual hint on hover */}
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                                        <div className="p-3 bg-white/20 backdrop-blur-[2px] rounded-full text-white shadow-xl transform scale-110">
                                            <Maximize2 className="w-6 h-6" />
                                        </div>
                                    </div>

                                    {/* Actions Overlay - Always visible on mobile, hover on desktop */}
                                    <div className={`absolute inset-x-0 bottom-0 p-2 md:p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-end justify-between transition-opacity duration-200 
                                        opacity-100 md:opacity-0 md:group-hover:opacity-100
                                        ${isSelected ? '!opacity-100' : ''}
                                    `}>
                                        {/* Helper text/badges */}
                                        {isSelected && (
                                            <span className="bg-green-500 text-white text-[9px] md:text-[10px] font-bold px-1.5 py-0.5 md:px-2 md:py-0.5 rounded-full shadow-sm">
                                                SELECTED
                                            </span>
                                        )}

                                        {!isSelected && <div />} {/* Spacer */}

                                        <div className="flex items-center gap-2 md:gap-3">
                                            {/* Select Button */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    toggleStatus(img.id, img.status, 'selected')
                                                }}
                                                disabled={isLoading}
                                                className={`p-2 md:p-2.5 rounded-full backdrop-blur-md transition-all transform active:scale-95 cursor-pointer ${isSelected
                                                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/30 scale-110'
                                                    : 'bg-white/20 text-white hover:bg-white/40 hover:scale-110'
                                                    }`}
                                                title="Select this photo"
                                            >
                                                {isLoading ? (
                                                    <Loader className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                                                ) : (
                                                    <Heart className={`w-4 h-4 md:w-5 md:h-5 ${isSelected ? 'fill-current' : ''}`} />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Loading State - Visual feedback on the heart button itself is sufficient */}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {viewingImage && (
                <ViewerModal
                    image={viewingImage}
                    images={filteredImages}
                    onClose={() => setViewingImage(null)}
                    onNavigate={(img) => setViewingImage(img)}
                    onToggle={(id, status) => toggleStatus(id, status, 'selected')}
                    isLoading={imageUpdateLoading === viewingImage.id}
                />
            )}
        </div>
    )
}

function ViewerModal({ image, images, onClose, onNavigate, onToggle, isLoading }) {
    const touchStart = useRef(0)
    const touchEnd = useRef(0)
    const [scale, setScale] = useState(1)
    const [initialDistance, setInitialDistance] = useState(null)

    // Reset zoom when image changes
    useEffect(() => {
        setScale(1)
    }, [image.id])

    const handleTouchStart = (e) => {
        if (e.targetTouches.length === 2) {
            const dist = Math.hypot(
                e.targetTouches[0].pageX - e.targetTouches[1].pageX,
                e.targetTouches[0].pageY - e.targetTouches[1].pageY
            )
            setInitialDistance(dist)
        } else {
            touchStart.current = e.targetTouches[0].clientX
        }
    }

    const handleTouchMove = (e) => {
        if (e.targetTouches.length === 2 && initialDistance) {
            const dist = Math.hypot(
                e.targetTouches[0].pageX - e.targetTouches[1].pageX,
                e.targetTouches[0].pageY - e.targetTouches[1].pageY
            )
            const zoomFactor = dist / initialDistance
            // Limit scale between 1 and 3
            setScale(prev => Math.min(Math.max(prev * zoomFactor, 1), 3))
            setInitialDistance(dist)
        } else if (scale === 1) { // Only swipe if not zoomed in
            touchEnd.current = e.targetTouches[0].clientX
        }
    }

    const handleTouchEnd = () => {
        setInitialDistance(null)
        if (scale === 1) {
            if (!touchStart.current || !touchEnd.current) return
            const distance = touchStart.current - touchEnd.current
            const isLeftSwipe = distance > 50
            const isRightSwipe = distance < -50

            if (isLeftSwipe) {
                const currentIndex = images.findIndex(img => img.id === image.id)
                const nextIdx = (currentIndex + 1) % images.length
                onNavigate(images[nextIdx])
            }
            if (isRightSwipe) {
                const currentIndex = images.findIndex(img => img.id === image.id)
                const prevIdx = (currentIndex - 1 + images.length) % images.length
                onNavigate(images[prevIdx])
            }
        }

        touchStart.current = 0
        touchEnd.current = 0
    }

    const isSelected = images.find(img => img.id === image.id)?.status === 'selected'

    return (
        <div
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-200 select-none"
            onContextMenu={(e) => e.preventDefault()}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Top Bar - Only Close */}
            <div className="absolute top-4 right-4 z-[110]">
                <button
                    onClick={onClose}
                    className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all cursor-pointer border border-white/20 backdrop-blur-md"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Navigation Arrows (Desktop Only) */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 hidden md:flex justify-between px-8 pointer-events-none z-[110]">
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        const currentIndex = images.findIndex(img => img.id === image.id)
                        const prevIdx = (currentIndex - 1 + images.length) % images.length
                        onNavigate(images[prevIdx])
                    }}
                    className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all cursor-pointer border border-white/20 pointer-events-auto backdrop-blur-sm"
                >
                    <ChevronLeft className="w-8 h-8 md:w-10 md:h-10" />
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        const currentIndex = images.findIndex(img => img.id === image.id)
                        const nextIdx = (currentIndex + 1) % images.length
                        onNavigate(images[nextIdx])
                    }}
                    className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all cursor-pointer border border-white/20 pointer-events-auto backdrop-blur-sm"
                >
                    <ChevronRight className="w-8 h-8 md:w-10 md:h-10" />
                </button>
            </div>

            {/* Main Content Area */}
            <div className="w-full flex-1 flex flex-col items-center justify-center p-4 md:p-12 relative pointer-events-none overflow-hidden text-center">
                <div
                    className="relative pointer-events-auto max-h-full max-w-full inline-block transition-transform duration-200 ease-out"
                    style={{ transform: `scale(${scale})` }}
                >
                    <PhotoTile
                        url={image.image_url}
                        className="max-w-full max-h-[70vh] md:max-h-[85vh] object-contain rounded-lg shadow-2xl shadow-white/5"
                        onClick={undefined}
                    />
                    {/* Protection Layer */}
                    <div className="absolute inset-0 bg-transparent z-10" />
                </div>
            </div>

            {/* Bottom Bar - Heart and Counter (Better Reach) */}
            <div className="w-full pb-10 md:pb-12 px-6 flex flex-col items-center gap-6 z-[110]">
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onToggle(image.id, image.status)
                    }}
                    className={`p-4 md:p-4 rounded-full border transition-all cursor-pointer backdrop-blur-md shadow-2xl ${isSelected
                        ? 'bg-green-500 text-white border-green-400 shadow-green-500/40 scale-110'
                        : 'bg-white/10 text-white border-white/20'
                        }`}
                    title="Select / Deselect"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <Loader className="w-6 h-6 animate-spin" />
                    ) : (
                        <Heart className={`w-6 h-6 ${isSelected ? 'fill-current' : ''}`} />
                    )}
                </button>

                <div className="bg-black/50 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 text-white text-xs md:text-sm font-medium">
                    {images.findIndex(img => img.id === image.id) + 1} / {images.length}
                </div>
            </div>
        </div>
    )
}

