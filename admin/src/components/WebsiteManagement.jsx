import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useNavigate } from 'react-router-dom'
import { S3Client, PutObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3'
import {
    ArrowLeft, Globe, Plus, Edit2, Trash2, Upload, X, Check,
    Lock, Image, Eye, AlertTriangle, FolderOpen, Loader2,
    CheckCircle2, Trash, ChevronRight, Camera, CheckSquare, Square
} from 'lucide-react'
import { toast } from 'sonner'

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
)

// AWS S3 Configuration
const accessKeyId = import.meta.env.VITE_AWS_ACCESS_KEY_ID
const secretAccessKey = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY
const region = import.meta.env.VITE_AWS_REGION
const bucketName = import.meta.env.VITE_AWS_BUCKET_NAME

const s3Client = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey }
})

// ─────────────────────────────────────────────
// Confirm Modal
// ─────────────────────────────────────────────
function ConfirmModal({ title, message, onConfirm, onCancel, dangerous = true, isLoading = false }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-gray-100">
                <div className={`h-1 ${dangerous ? 'bg-gradient-to-r from-red-500 to-rose-600' : 'bg-gradient-to-r from-blue-500 to-indigo-600'}`} />
                <div className="p-6">
                    <div className={`w-12 h-12 rounded-2xl ${dangerous ? 'bg-red-50' : 'bg-blue-50'} flex items-center justify-center mx-auto mb-4`}>
                        {dangerous ? <Trash2 className="w-6 h-6 text-red-500" /> : <AlertTriangle className="w-6 h-6 text-blue-500" />}
                    </div>
                    <h2 className="text-lg font-black text-gray-900 text-center mb-1">{title}</h2>
                    <p className="text-sm text-gray-600 text-center mb-6 leading-relaxed">{message}</p>
                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            disabled={isLoading}
                            className="flex-1 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-black text-white rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed ${dangerous ? 'bg-red-500 hover:bg-red-600 shadow-red-100' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'}`}
                        >
                            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {isLoading ? 'Deleting…' : 'Confirm'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────
// Input Modal (create / rename category)
// ─────────────────────────────────────────────
function InputModal({ title, placeholder, defaultValue = '', onConfirm, onCancel }) {
    const [value, setValue] = useState(defaultValue)
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-gray-100">
                <div className="h-1 bg-gradient-to-r from-indigo-500 to-indigo-700" />
                <div className="p-6">
                    <h2 className="text-lg font-black text-gray-900 mb-4">{title}</h2>
                    <input
                        autoFocus
                        type="text"
                        value={value}
                        onChange={e => setValue(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && value.trim() && onConfirm(value.trim())}
                        placeholder={placeholder}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-4 transition-all"
                    />
                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            className="flex-1 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => value.trim() && onConfirm(value.trim())}
                            disabled={!value.trim()}
                            className="flex-1 py-2.5 text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-100 transition-all cursor-pointer disabled:opacity-40"
                        >
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────
// Image Edit Alt Modal
// ─────────────────────────────────────────────
function AltEditModal({ defaultValue = '', onConfirm, onCancel }) {
    const [value, setValue] = useState(defaultValue)
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-gray-100">
                <div className="h-1 bg-gradient-to-r from-indigo-500 to-indigo-700" />
                <div className="p-6">
                    <h2 className="text-lg font-black text-gray-900 mb-1">Edit Image Details</h2>
                    <p className="text-xs text-gray-600 mb-4">Update the alt text for this image.</p>
                    <input
                        autoFocus
                        type="text"
                        value={value}
                        onChange={e => setValue(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && onConfirm(value.trim())}
                        placeholder="Alt text (optional)"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-4 transition-all"
                    />
                    <div className="flex gap-3">
                        <button onClick={onCancel} className="flex-1 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all cursor-pointer">
                            Cancel
                        </button>
                        <button onClick={() => onConfirm(value.trim())} className="flex-1 py-2.5 text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-100 transition-all cursor-pointer">
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────
// Upload Progress Modal
// ─────────────────────────────────────────────
function UploadProgressModal({ currentFile, uploadedCount, totalFiles, progress }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-gray-100 p-6 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                        <Upload className="w-5 h-5 animate-bounce" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-gray-900 leading-tight">Uploading Images</h2>
                        <p className="text-xs text-gray-500 font-medium">Please wait until the upload completes.</p>
                    </div>
                </div>

                <div className="space-y-2 mt-4">
                    <div className="flex items-center justify-between text-xs text-gray-600 font-medium font-mono">
                        <span className="truncate max-w-[70%]" title={currentFile}>
                            {currentFile || 'Starting…'}
                        </span>
                        <span className="font-bold text-indigo-600">
                            {uploadedCount} / {totalFiles}
                        </span>
                    </div>

                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden shadow-inner flex items-center p-[2px]">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    <p className="text-center text-xs font-black text-indigo-600">{progress}% completely</p>
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────
// Media Item (Individual image with loading state)
// ─────────────────────────────────────────────
function MediaItem({ src, alt, className, containerClassName, children }) {
    const [loading, setLoading] = useState(true)
    return (
        <div className={`relative overflow-hidden ${containerClassName}`}>
            {loading && (
                <div className="absolute inset-0 bg-slate-100 animate-pulse rounded-2xl border border-slate-200" />
            )}
            <img
                src={src}
                alt={alt}
                className={`${className} ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-500`}
                onLoad={() => setLoading(false)}
                loading="lazy"
            />
            {!loading && children}
        </div>
    )
}

// ─────────────────────────────────────────────
// Category Images View
// ─────────────────────────────────────────────
function CategoryImagesView({ category, onBack }) {
    const [images, setImages] = useState([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [uploadCurrentFile, setUploadCurrentFile] = useState('')
    const [uploadedCount, setUploadedCount] = useState(0)
    const [totalUploadFiles, setTotalUploadFiles] = useState(0)
    const [deleteTarget, setDeleteTarget] = useState(null)
    const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false)
    const [editTarget, setEditTarget] = useState(null)
    const [selectedIds, setSelectedIds] = useState(new Set())
    const [isSelectionMode, setIsSelectionMode] = useState(false)
    const fileInputRef = useRef()

    useEffect(() => { fetchImages() }, [category.id])

    async function fetchImages() {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('website_category_images')
                .select('*')
                .eq('category_id', category.id)
                .order('created_at', { ascending: true })
            if (error) throw error
            setImages(data || [])
        } catch {
            toast.error('Failed to load images')
        } finally {
            setLoading(false)
        }
    }

    async function handleUpload(files) {
        if (!files || !files.length || !accessKeyId || !secretAccessKey || !region || !bucketName) {
            if (!bucketName) toast.error('AWS credentials missing')
            return
        }
        setUploading(true)
        setUploadProgress(0)
        setUploadedCount(0)
        setTotalUploadFiles(files.length)
        setUploadCurrentFile('')

        let successCount = 0
        const sanitize = (name) => name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, '')

        // Calculate next sort order
        const maxSortOrder = images.reduce((max, img) => Math.max(max, img.sort_order || 0), -1)
        let nextSortOrder = maxSortOrder + 1

        for (const file of Array.from(files)) {
            setUploadCurrentFile(file.name)
            try {
                const timestamp = Date.now()
                const sanitizedName = sanitize(file.name)
                const key = `website/${category.id}/${timestamp}-${sanitizedName}`

                const arrayBuffer = await file.arrayBuffer()
                await s3Client.send(new PutObjectCommand({
                    Bucket: bucketName,
                    Key: key,
                    Body: new Uint8Array(arrayBuffer),
                    ContentType: file.type,
                }))

                const s3Url = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`

                const { error: dbErr } = await supabase.from('website_category_images').insert({
                    category_id: category.id,
                    image_url: s3Url,
                    alt_text: '',
                    sort_order: nextSortOrder++
                })
                if (dbErr) throw dbErr
                successCount++
                setUploadedCount(successCount)
                setUploadProgress(Math.round((successCount / files.length) * 100))
            } catch (err) {
                toast.error(`Failed to upload ${file.name}: ${err.message}`)
            }
        }
        if (successCount > 0) toast.success(`Uploaded ${successCount} image${successCount > 1 ? 's' : ''}`)
        await fetchImages()
        setUploading(false)
        setUploadProgress(0)
        setUploadCurrentFile('')
        setTotalUploadFiles(0)
    }

    async function handleDeleteImage() {
        if (!deleteTarget) return
        setLoading(true)
        try {
            // Extract key from S3 URL
            const url = new URL(deleteTarget.image_url)
            const key = decodeURIComponent(url.pathname.substring(1))

            // Delete from S3
            await s3Client.send(new DeleteObjectsCommand({
                Bucket: bucketName,
                Delete: { Objects: [{ Key: key }], Quiet: true }
            }))

            // Delete from DB
            const { error } = await supabase.from('website_category_images').delete().eq('id', deleteTarget.id)
            if (error) throw error

            toast.success('Image deleted')
            setImages(prev => prev.filter(i => i.id !== deleteTarget.id))
        } catch (err) {
            toast.error('Failed to delete image: ' + err.message)
        } finally {
            setDeleteTarget(null)
            setLoading(false)
        }
    }

    async function handleBatchDelete() {
        if (selectedIds.size === 0) return

        const targets = images.filter(img => selectedIds.has(img.id))
        setLoading(true)

        try {
            // 1. Delete from S3
            const s3Objects = targets.map(img => {
                const url = new URL(img.image_url)
                return { Key: decodeURIComponent(url.pathname.substring(1)) }
            })

            await s3Client.send(new DeleteObjectsCommand({
                Bucket: bucketName,
                Delete: { Objects: s3Objects, Quiet: true }
            }))

            // 2. Delete from DB
            const { error } = await supabase
                .from('website_category_images')
                .delete()
                .in('id', Array.from(selectedIds))

            if (error) throw error

            toast.success(`${selectedIds.size} images deleted`)
            setImages(prev => prev.filter(i => !selectedIds.has(i.id)))
            setSelectedIds(new Set())
            setIsSelectionMode(false)
            setShowBatchDeleteModal(false)
        } catch (err) {
            toast.error('Failed to delete images: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    async function handleEditAlt(newAlt) {
        if (!editTarget) return
        try {
            const { error } = await supabase
                .from('website_category_images')
                .update({ alt_text: newAlt })
                .eq('id', editTarget.id)
            if (error) throw error
            toast.success('Alt text updated')
            setImages(prev => prev.map(i => i.id === editTarget.id ? { ...i, alt_text: newAlt } : i))
        } catch {
            toast.error('Failed to update alt text')
        } finally {
            setEditTarget(null)
        }
    }

    const toggleSelect = (id) => {
        const next = new Set(selectedIds)
        if (next.has(id)) {
            next.delete(id)
            if (next.size === 0) setIsSelectionMode(false)
        } else {
            next.add(id)
            setIsSelectionMode(true)
        }
        setSelectedIds(next)
    }

    const selectAll = () => {
        if (selectedIds.size === images.length && images.length > 0) {
            setSelectedIds(new Set())
            setIsSelectionMode(false)
        } else {
            setSelectedIds(new Set(images.map(img => img.id)))
            setIsSelectionMode(true)
        }
    }

    return (
        <div className="min-h-screen bg-[#fbfbfb]">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-3 sm:px-8 py-3 sm:py-4 flex items-center gap-2 sm:gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 sm:p-2.5 rounded-xl hover:bg-gray-50 text-gray-500 transition-all cursor-pointer border border-gray-100 shrink-0"
                    >
                        <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        <div className="p-2 sm:p-2.5 bg-indigo-600 rounded-xl shadow-md shadow-indigo-600/30 shrink-0">
                            <Image className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h1 className="text-base sm:text-xl font-black text-gray-900 leading-tight truncate">{category.name}</h1>
                                {category.is_default && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[10px] font-bold border border-gray-200">
                                        <Lock className="w-3 h-3" /> Protected
                                    </span>
                                )}
                            </div>
                            <p className="text-xs sm:text-sm text-gray-600 font-medium">{images.length} image{images.length !== 1 ? 's' : ''}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {images.length > 0 && (
                            <button
                                onClick={selectAll}
                                className={`flex items-center gap-2 px-3 sm:px-4 py-2 ${selectedIds.size === images.length ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-50 text-gray-700'} hover:bg-gray-100 text-sm font-bold rounded-xl shadow-sm transition-all cursor-pointer`}
                            >
                                {selectedIds.size === images.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                <span className="hidden sm:inline">Select All</span>
                            </button>
                        )}
                        {isSelectionMode ? (
                            <button
                                onClick={() => setShowBatchDeleteModal(true)}
                                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl shadow-md shadow-red-600/20 transition-all cursor-pointer"
                            >
                                <Trash2 className="w-4 h-4" />
                                <span className="hidden sm:inline">Delete ({selectedIds.size})</span>
                            </button>
                        ) : (
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-md shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-60 shrink-0"
                            >
                                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                <span className="hidden sm:inline">{uploading ? 'Uploading…' : 'Upload'}</span>
                            </button>
                        )}
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={e => handleUpload(e.target.files)}
                    />
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
                {loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="aspect-video bg-white rounded-2xl border border-gray-200 animate-pulse" />
                        ))}
                    </div>
                ) : images.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 border border-gray-200">
                            <Image className="w-8 h-8 text-gray-300" />
                        </div>
                        <h3 className="font-black text-gray-900 text-lg mb-1">No images yet</h3>
                        <p className="text-sm text-gray-600 mb-5">Upload images to populate this category on your website.</p>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
                        >
                            <Upload className="w-4 h-4" /> Upload Images
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {images.map(img => (
                            <div
                                key={img.id}
                                className={`group relative aspect-video bg-gray-50 rounded-2xl overflow-hidden border shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer ${selectedIds.has(img.id) ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-gray-200'}`}
                                onClick={() => isSelectionMode ? toggleSelect(img.id) : null}
                            >
                                <MediaItem
                                    src={img.image_url}
                                    alt={img.alt_text || category.name}
                                    className={`w-full h-full object-cover transition-transform duration-500 ${selectedIds.has(img.id) ? 'scale-95' : 'group-hover:scale-105'}`}
                                    containerClassName="w-full h-full"
                                >
                                    {/* Top Action Bar - Always Visible */}
                                    <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                                        {/* Selection Badge */}
                                        <div
                                            className={`w-7 h-7 rounded-lg flex items-center justify-center border-2 transition-all cursor-pointer shadow-md backdrop-blur-sm ${selectedIds.has(img.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white/90 border-white hover:bg-indigo-50 hover:border-indigo-200'}`}
                                            onClick={(e) => { e.stopPropagation(); toggleSelect(img.id); }}
                                        >
                                            {selectedIds.has(img.id) && <Check className="w-4 h-4 stroke-[3]" />}
                                        </div>

                                        {/* Action Buttons - Always Visible */}
                                        {!isSelectionMode && (
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setEditTarget(img); }}
                                                    className="p-2 bg-white/90 hover:bg-white rounded-lg text-gray-600 hover:text-indigo-600 transition-all shadow-md backdrop-blur-sm cursor-pointer"
                                                    title="Edit alt text"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(img); }}
                                                    className="p-2 bg-red-500 hover:bg-red-600 rounded-lg text-white transition-all shadow-md backdrop-blur-sm cursor-pointer"
                                                    title="Delete image"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Alt text badge */}
                                    {img.alt_text && (
                                        <div className="absolute bottom-0 left-0 right-0 px-3 py-1.5 bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium truncate">
                                            {img.alt_text}
                                        </div>
                                    )}
                                </MediaItem>
                            </div>
                        ))}
                        {/* Upload more tile */}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="aspect-video border-2 border-dashed border-gray-200 hover:border-indigo-400 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-indigo-600 transition-all cursor-pointer bg-white group"
                        >
                            <div className="p-2 bg-gray-50 rounded-xl group-hover:bg-indigo-50 transition-colors">
                                <Plus className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-bold">Add More</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Modals */}
            {deleteTarget && (
                <ConfirmModal
                    title="Delete Image?"
                    message="This image will be permanently removed from your AWS S3 bucket and the database."
                    onConfirm={handleDeleteImage}
                    onCancel={() => setDeleteTarget(null)}
                    isLoading={loading}
                />
            )}
            {showBatchDeleteModal && (
                <ConfirmModal
                    title="Delete Multiple Images?"
                    message={`Are you sure you want to permanently delete ${selectedIds.size} images? They will be removed from AWS S3 and the database.`}
                    onConfirm={handleBatchDelete}
                    onCancel={() => setShowBatchDeleteModal(false)}
                    isLoading={loading}
                />
            )}
            {editTarget && (
                <AltEditModal
                    defaultValue={editTarget.alt_text || ''}
                    onConfirm={handleEditAlt}
                    onCancel={() => setEditTarget(null)}
                />
            )}

            {uploading && (
                <UploadProgressModal
                    currentFile={uploadCurrentFile}
                    uploadedCount={uploadedCount}
                    totalFiles={totalUploadFiles}
                    progress={uploadProgress}
                />
            )}
        </div>
    )
}

// ─────────────────────────────────────────────
// Category List View (main view)
// ─────────────────────────────────────────────
export default function WebsiteManagement() {
    const navigate = useNavigate()
    const [categories, setCategories] = useState([])
    const [imageCounts, setImageCounts] = useState({})
    const [loading, setLoading] = useState(true)
    const [selectedCategory, setSelectedCategory] = useState(null)

    // Modals
    const [showCreate, setShowCreate] = useState(false)
    const [editCategory, setEditCategory] = useState(null)
    const [deleteCategory, setDeleteCategory] = useState(null)

    const [uploadingCover, setUploadingCover] = useState(null)
    const coverInputRef = useRef()
    const [targetCatForCover, setTargetCatForCover] = useState(null)

    useEffect(() => { fetchCategories() }, [])

    async function fetchCategories() {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('website_categories')
                .select('*')
                .order('sort_order', { ascending: true })
            if (error) throw error
            setCategories(data || [])

            // Fetch image counts per category
            if (data && data.length > 0) {
                const { data: countsData, error: countErr } = await supabase
                    .from('website_category_images')
                    .select('category_id')

                if (!countErr) {
                    const counts = {}
                    countsData.forEach(item => {
                        counts[item.category_id] = (counts[item.category_id] || 0) + 1
                    })
                    setImageCounts(counts)
                }
            }
        } catch {
            toast.error('Failed to load categories')
        } finally {
            setLoading(false)
        }
    }

    async function handleCreateCategory(name) {
        try {
            const maxOrder = categories.reduce((m, c) => Math.max(m, c.sort_order), 0)
            const { data, error } = await supabase
                .from('website_categories')
                .insert({ name, is_default: false, sort_order: maxOrder + 1 })
                .select()
                .single()
            if (error) throw error
            toast.success('Category created')
            setCategories(prev => [...prev, data])
            setImageCounts(prev => ({ ...prev, [data.id]: 0 }))
        } catch (err) {
            toast.error('Failed to create category: ' + err.message)
        } finally {
            setShowCreate(false)
        }
    }

    async function handleEditCategory(name) {
        if (!editCategory) return
        try {
            const { error } = await supabase
                .from('website_categories')
                .update({ name })
                .eq('id', editCategory.id)
            if (error) throw error
            toast.success('Category renamed')
            setCategories(prev => prev.map(c => c.id === editCategory.id ? { ...c, name } : c))
        } catch (err) {
            toast.error('Failed to rename category')
        } finally {
            setEditCategory(null)
        }
    }

    const [deleteCategoryLoading, setDeleteCategoryLoading] = useState(false)

    async function handleDeleteCategory() {
        if (!deleteCategory) return
        setDeleteCategoryLoading(true)

        try {
            // 1. Get all images in this category to delete from S3
            const { data: imagesToDelete } = await supabase
                .from('website_category_images')
                .select('image_url')
                .eq('category_id', deleteCategory.id)

            if (imagesToDelete && imagesToDelete.length > 0) {
                const objects = imagesToDelete.map(img => {
                    try {
                        const url = new URL(img.image_url)
                        return { Key: decodeURIComponent(url.pathname.substring(1)) }
                    } catch {
                        return null
                    }
                }).filter(Boolean)

                if (objects.length > 0) {
                    await s3Client.send(new DeleteObjectsCommand({
                        Bucket: bucketName,
                        Delete: { Objects: objects, Quiet: true }
                    }))
                }
            }

            // 2. Delete from DB (cascade handles website_category_images)
            const { error } = await supabase
                .from('website_categories')
                .delete()
                .eq('id', deleteCategory.id)
            if (error) throw error

            toast.success('Category deleted')
            setCategories(prev => prev.filter(c => c.id !== deleteCategory.id))
        } catch (err) {
            toast.error('Failed to delete category: ' + err.message)
        } finally {
            setDeleteCategory(null)
            setDeleteCategoryLoading(false)
        }
    }

    async function handleUploadCover(files) {
        if (!files || !files.length || !targetCatForCover) return
        setUploadingCover(targetCatForCover.id)
        try {
            const file = files[0]
            const timestamp = Date.now()
            const key = `website/categories/${targetCatForCover.id}/cover-${timestamp}`

            const arrayBuffer = await file.arrayBuffer()
            await s3Client.send(new PutObjectCommand({
                Bucket: bucketName,
                Key: key,
                Body: new Uint8Array(arrayBuffer),
                ContentType: file.type,
            }))

            const s3Url = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`

            const { error } = await supabase
                .from('website_categories')
                .update({ cover_image_url: s3Url })
                .eq('id', targetCatForCover.id)

            if (error) {
                if (error.message.includes('column "cover_image_url" does not exist')) {
                    throw new Error('Database column missing. Please run the SQL migration in Supabase dashboard.')
                }
                throw error
            }

            toast.success('Cover image updated')
            setCategories(prev => prev.map(c => c.id === targetCatForCover.id ? { ...c, cover_image_url: s3Url } : c))
        } catch (err) {
            toast.error(err.message)
        } finally {
            setUploadingCover(null)
            setTargetCatForCover(null)
            if (coverInputRef.current) coverInputRef.current.value = ''
        }
    }

    if (selectedCategory) {
        return (
            <CategoryImagesView
                category={selectedCategory}
                onBack={() => {
                    setSelectedCategory(null)
                    fetchCategories()
                }}
            />
        )
    }

    const PALETTE = [
        { bg: 'bg-indigo-50', border: 'border-indigo-100', icon: 'bg-indigo-500', text: 'text-indigo-600' },
        { bg: 'bg-slate-50', border: 'border-slate-100', icon: 'bg-slate-500', text: 'text-slate-600' },
        { bg: 'bg-rose-50', border: 'border-rose-100', icon: 'bg-rose-500', text: 'text-rose-600' },
        { bg: 'bg-emerald-50', border: 'border-emerald-100', icon: 'bg-emerald-500', text: 'text-emerald-600' },
        { bg: 'bg-amber-50', border: 'border-amber-100', icon: 'bg-amber-500', text: 'text-amber-600' },
    ]

    return (
        <div className="min-h-screen bg-[#fbfbfb]">
            {/* ── Header ── */}
            <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/home')}
                            className="p-2 hover:bg-gray-50 rounded-xl transition-colors shrink-0 border border-gray-100"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-500" />
                        </button>
                        <div>
                            <h1 className="text-xl font-black text-slate-900 leading-tight tracking-tight">Website Management</h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{categories.length} Sections Active</p>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowCreate(true)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black rounded-xl shadow-lg shadow-indigo-100 transition-all cursor-pointer active:scale-95 shrink-0"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">New Category</span>
                    </button>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">


                {/* Category grid */}
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6 animate-pulse h-40" />
                        ))}
                    </div>
                ) : categories.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm py-20 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-200">
                            <FolderOpen className="w-8 h-8 text-gray-300" />
                        </div>
                        <h3 className="font-black text-gray-900 text-lg mb-1">No categories yet</h3>
                        <p className="text-sm text-gray-600 mb-6">Create your first category to start organizing images for your website.</p>
                        <button
                            onClick={() => setShowCreate(true)}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white text-sm font-black rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 cursor-pointer"
                        >
                            <Plus className="w-4 h-4" /> Add Category
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {categories.map((cat, idx) => {
                            const count = imageCounts[cat.id] ?? 0
                            return (
                                <div
                                    key={cat.id}
                                    className="group relative h-72 bg-white rounded-[32px] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgb(0,0,0,0.1)] transition-all duration-500 cursor-pointer border border-slate-100 hover:border-indigo-100"
                                    onClick={() => setSelectedCategory(cat)}
                                >
                                    {/* Full Card Background Image */}
                                    <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-105">
                                        {cat.cover_image_url ? (
                                            <MediaItem
                                                src={cat.cover_image_url}
                                                className="w-full h-full object-cover opacity-90 transition-opacity"
                                                containerClassName="w-full h-full"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-slate-50 flex items-center justify-center">
                                                <Image className="w-12 h-12 text-slate-200" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Soft Gradient Overlay for Readability - Only if image exists */}
                                    {cat.cover_image_url && (
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-80" />
                                    )}

                                    <div className="absolute inset-0 p-5 flex flex-col justify-end">
                                        {/* Top Action Bar - Always Visible */}
                                        <div className="mb-auto flex justify-end items-start gap-2" onClick={e => e.stopPropagation()}>
                                            {/* Edit Photo Button */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setTargetCatForCover(cat)
                                                    coverInputRef.current?.click()
                                                }}
                                                className={`p-2.5 rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-90 cursor-pointer backdrop-blur-md ${cat.cover_image_url ? 'bg-white/90 hover:bg-white text-slate-600 hover:text-indigo-600' : 'bg-white hover:bg-indigo-50 text-slate-500 hover:text-indigo-600'}`}
                                                title={cat.cover_image_url ? "Change Cover" : "Add Cover"}
                                            >
                                                <Camera className="w-4 h-4" />
                                            </button>

                                            {/* Edit Name Button - Only for non-default */}
                                            {!cat.is_default && (
                                                <button
                                                    onClick={() => setEditCategory(cat)}
                                                    className={`p-2.5 rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-90 cursor-pointer backdrop-blur-md ${cat.cover_image_url ? 'bg-white/90 hover:bg-white text-slate-600 hover:text-indigo-600' : 'bg-white hover:bg-indigo-50 text-slate-500 hover:text-indigo-600'}`}
                                                    title="Rename"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                            )}

                                            {/* Delete Button - Only for non-default */}
                                            {!cat.is_default && (
                                                <button
                                                    onClick={() => {
                                                        const count = imageCounts[cat.id] ?? 0
                                                        if (count > 0) {
                                                            toast.error(`Cannot delete "${cat.name}" - it contains ${count} image${count > 1 ? 's' : ''}. Please remove all images first.`)
                                                        } else {
                                                            setDeleteCategory(cat)
                                                        }
                                                    }}
                                                    className={`p-2.5 rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-90 cursor-pointer backdrop-blur-md ${cat.cover_image_url ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}

                                            {/* Lock Icon for System Categories */}
                                            {cat.is_default && (
                                                <div
                                                    className={`p-2.5 rounded-xl shadow-lg backdrop-blur-md ${cat.cover_image_url ? 'bg-white/90 text-slate-400' : 'bg-white text-slate-300'}`}
                                                    title="System Protected"
                                                >
                                                    <Lock className="w-4 h-4" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Bottom Content */}
                                        <div className={`rounded-2xl p-4 ${cat.cover_image_url ? 'bg-black/30 backdrop-blur-md' : 'bg-slate-50/80'}`}>
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className={`text-lg font-black tracking-tight truncate ${cat.cover_image_url ? 'text-white' : 'text-slate-900'}`}>{cat.name}</h3>
                                                        {cat.is_default && (
                                                            <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-tight rounded-full shrink-0 ${cat.cover_image_url ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                                                System
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className={`text-[10px] font-bold uppercase tracking-widest ${cat.cover_image_url ? 'text-white/70' : 'text-slate-400'}`}>
                                                        {count} {count === 1 ? 'Photos' : 'Photos'}
                                                    </p>
                                                </div>
                                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all ${cat.cover_image_url ? 'bg-white/20 text-white hover:bg-white hover:text-indigo-600' : 'bg-slate-200 text-slate-600 hover:bg-indigo-600 hover:text-white'}`}>
                                                    <Eye className="w-3 h-3" />
                                                    Open
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {uploadingCover === cat.id && (
                                        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-50">
                                            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                                        </div>
                                    )}
                                </div>
                            )
                        })}

                        {/* Add category card */}
                        <button
                            onClick={() => setShowCreate(true)}
                            className="h-72 border-4 border-dashed border-slate-100 hover:border-indigo-200 rounded-[32px] flex flex-col items-center justify-center gap-4 text-slate-300 hover:text-indigo-400 transition-all duration-300 bg-white group hover:bg-indigo-50/20 shadow-sm hover:shadow-lg"
                        >
                            <div className="w-16 h-16 rounded-3xl border-2 border-current flex items-center justify-center transition-all group-hover:scale-110 group-hover:bg-indigo-50">
                                <Plus className="w-8 h-8" />
                            </div>
                            <span className="text-sm font-black uppercase tracking-[0.2em]">Add Section</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Modals */}
            {showCreate && (
                <InputModal
                    title="New Category"
                    placeholder="e.g. Portfolio, Awards…"
                    onConfirm={handleCreateCategory}
                    onCancel={() => setShowCreate(false)}
                />
            )}
            {editCategory && (
                <InputModal
                    title="Rename Category"
                    placeholder="Category name"
                    defaultValue={editCategory.name}
                    onConfirm={handleEditCategory}
                    onCancel={() => setEditCategory(null)}
                />
            )}
            {deleteCategory && (
                <ConfirmModal
                    title="Delete Category?"
                    message={`Are you sure you want to delete "${deleteCategory.name}"? All associated images will be permanently removed from AWS S3.`}
                    onConfirm={handleDeleteCategory}
                    onCancel={() => setDeleteCategory(null)}
                    isLoading={deleteCategoryLoading}
                />
            )}

            {/* Hidden cover input */}
            <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => handleUploadCover(e.target.files)}
            />
        </div>
    )
}
