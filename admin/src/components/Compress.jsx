import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, FolderOpen, Download, Loader, Image as ImageIcon, Zap, X, ChevronDown, Check, Upload } from 'lucide-react'
import { toast } from 'sonner'
import JSZip from 'jszip'
import { createClient } from '@supabase/supabase-js'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    serviceKey || anonKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
)

async function compressImage(file, { maxWidth = 1920, quality = 0.75 } = {}) {
    return new Promise((resolve, reject) => {
        const img = new Image()
        const url = URL.createObjectURL(file)
        img.onload = () => {
            URL.revokeObjectURL(url)
            let { width, height } = img
            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width)
                width = maxWidth
            }
            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')
            ctx.drawImage(img, 0, 0, width, height)
            canvas.toBlob(
                (blob) => { if (blob) resolve(blob); else reject(new Error(`Failed to compress ${file.name}`)) },
                'image/jpeg', quality
            )
        }
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`Failed to load ${file.name}`)) }
        img.src = url
    })
}

export default function Compress() {
    const navigate = useNavigate()
    const inputRef = useRef(null)

    const [files, setFiles] = useState([])
    const [compressing, setCompressing] = useState(false)
    const [progress, setProgress] = useState(0)
    const [currentFile, setCurrentFile] = useState('')
    const [done, setDone] = useState(false)
    const [maxWidth] = useState(1920)
    const [quality, setQuality] = useState(75)
    const [events, setEvents] = useState([])
    const [selectedEventId, setSelectedEventId] = useState('')
    const [uploading, setUploading] = useState(false)
    const [isUploadMode, setIsUploadMode] = useState(false)
    const [totalCompressedSize, setTotalCompressedSize] = useState(0)
    const [rootFolderName, setRootFolderName] = useState('')

    useEffect(() => { fetchEvents() }, [])

    async function fetchEvents() {
        try {
            const { data, error } = await supabase
                .from('events')
                .select('id, event_name, wedding_name')
                .order('event_date', { ascending: false })
            if (error) throw error
            setEvents(data || [])
        } catch { toast.error('Failed to load events') }
    }

    async function handleCompressAndUpload() {
        if (files.length === 0 || !selectedEventId) { toast.error('Please select an event first'); return }
        const accessKeyId = import.meta.env.VITE_AWS_ACCESS_KEY_ID
        const secretAccessKey = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY
        const region = import.meta.env.VITE_AWS_REGION
        const bucketName = import.meta.env.VITE_AWS_BUCKET_NAME
        if (!accessKeyId || !secretAccessKey || !region || !bucketName) { toast.error('AWS credentials missing'); return }

        const selectedEvent = events.find(e => e.id.toString() === selectedEventId.toString())
        if (!selectedEvent) return

        setUploading(true); setCompressing(true); setProgress(0); setDone(false); setTotalCompressedSize(0)
        const toastId = toast.loading(`Processing ${files.length} images...`)
        try {
            const s3Client = new S3Client({ region, credentials: { accessKeyId, secretAccessKey } })
            const sanitize = (name) => (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
            const eventName = selectedEvent.event_name || selectedEvent.wedding_name || 'event'
            const folderName = `${sanitize(eventName)}-compressed`
            let processed = 0, compressedSizeAcc = 0
            for (const file of files) {
                setCurrentFile(file.name)
                const blob = await compressImage(file, { maxWidth, quality: quality / 100 })
                compressedSizeAcc += blob.size
                setTotalCompressedSize(compressedSizeAcc)
                const outName = file.name.replace(/\.[^.]+$/, '') + '.jpg'
                const key = `events/${folderName}/${outName}`
                await s3Client.send(new PutObjectCommand({ Bucket: bucketName, Key: key, Body: new Uint8Array(await blob.arrayBuffer()), ContentType: 'image/jpeg' }))
                const s3Url = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`
                const { error: dbError } = await supabase.from('event_images').insert({ event_id: selectedEventId, image_url: s3Url, status: 'none' })
                if (dbError) throw dbError
                processed++
                setProgress(Math.round((processed / files.length) * 100))
            }
            toast.success(`Uploaded ${processed} images to "${eventName}"`, { id: toastId })
            setDone(true); setFiles([])
        } catch (error) {
            toast.error(`Failed: ${error.message}`, { id: toastId })
        } finally { setUploading(false); setCompressing(false); setCurrentFile('') }
    }

    function handleFolderSelect(e) {
        const all = Array.from(e.target.files || [])
        const images = all.filter(f => f.type.startsWith('image/'))
        if (all[0]?.webkitRelativePath) setRootFolderName(all[0].webkitRelativePath.split('/')[0])
        else setRootFolderName('images')
        const skipped = all.length - images.length
        if (skipped > 0) toast.warning(`Skipped ${skipped} non-image files`)
        setFiles(images); setDone(false); setProgress(0)
    }

    function handleDrop(e) {
        e.preventDefault()
        const all = Array.from(e.dataTransfer.files)
        const images = all.filter(f => f.type.startsWith('image/'))
        if (all[0]?.webkitRelativePath) setRootFolderName(all[0].webkitRelativePath.split('/')[0])
        else setRootFolderName('compressed')
        const skipped = all.length - images.length
        if (skipped > 0) toast.warning(`Skipped ${skipped} non-image files`)
        setFiles(images); setDone(false)
    }

    async function handleCompress() {
        if (files.length === 0) return
        setCompressing(true); setProgress(0); setDone(false); setTotalCompressedSize(0)
        const toastId = toast.loading(`Compressing ${files.length} images...`)
        try {
            const safeName = rootFolderName.replace(/[^a-z0-9_-]/gi, '_') || 'photos'
            const zip = new JSZip()
            const folder = zip.folder(`${safeName}_compressed`)
            let compressedSizeAcc = 0
            for (let i = 0; i < files.length; i++) {
                const file = files[i]
                setCurrentFile(file.name)
                const blob = await compressImage(file, { maxWidth, quality: quality / 100 })
                compressedSizeAcc += blob.size
                setTotalCompressedSize(compressedSizeAcc)
                folder.file(file.name.replace(/\.[^.]+$/, '') + '.jpg', blob)
                setProgress(Math.round(((i + 1) / files.length) * 100))
            }
            setCurrentFile('Generating ZIP...')
            const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'STORE' })
            const url = URL.createObjectURL(zipBlob)
            const a = document.createElement('a'); a.href = url; a.download = `${safeName}_compressed.zip`; a.click()
            URL.revokeObjectURL(url)
            toast.success(`Done! ${files.length} images compressed`, { id: toastId })
            setDone(true)
        } catch (err) {
            toast.error(`Failed: ${err.message}`, { id: toastId })
        } finally { setCompressing(false); setCurrentFile('') }
    }

    const formatSize = (bytes) => {
        if (bytes === 0) return '0 B'
        const k = 1024, sizes = ['B', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }
    const totalOriginalBytes = files.reduce((sum, f) => sum + f.size, 0)
    const estimatedMB = (totalOriginalBytes / (1024 * 1024)) * (quality / 100) * 0.35

    return (
        <div className="min-h-screen bg-[#f8f9fa]">

            {/* ── Header ── */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/photos')} className="p-2 hover:bg-gray-100 rounded-xl transition-colors shrink-0">
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-sm font-black text-gray-900 leading-tight flex items-center gap-2">
                                <Zap className="w-5 h-5 text-amber-500" /> Image Compressor
                            </h1>
                            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Compress & Upload Photos</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="hidden sm:block text-xs font-semibold text-gray-600">Quality</span>
                        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
                            <input
                                type="range" min="40" max="95" step="5"
                                value={quality}
                                onChange={e => setQuality(+e.target.value)}
                                className="w-20 accent-blue-600"
                                disabled={compressing}
                            />
                            <span className="text-sm font-black text-blue-600 w-8 text-right">{quality}%</span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-6 sm:py-8 space-y-4">

                {/* Drop Zone */}
                <div
                    className="bg-white rounded-2xl border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50/40 transition-all p-10 text-center cursor-pointer group shadow-sm"
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-blue-400', 'bg-blue-50') }}
                    onDragLeave={(e) => { e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50') }}
                    onDrop={(e) => { e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50'); handleDrop(e) }}
                    onClick={() => inputRef.current?.click()}
                >
                    <input ref={inputRef} type="file" multiple webkitdirectory="" directory="" className="hidden" onChange={handleFolderSelect} />
                    <div className="flex flex-col items-center gap-3">
                        <div className="p-4 bg-gray-100 group-hover:bg-blue-100 rounded-2xl transition-colors">
                            <FolderOpen className="w-10 h-10 text-gray-600 group-hover:text-blue-500 transition-colors" />
                        </div>
                        <div>
                            <p className="font-black text-gray-900 text-base">Drop your originals folder here</p>
                            <p className="text-gray-600 text-sm mt-1">or click to browse — only images are processed</p>
                        </div>
                    </div>
                </div>

                {/* File count */}
                {files.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-blue-50 rounded-xl"><ImageIcon className="w-5 h-5 text-blue-600" /></div>
                                <div>
                                    <p className="font-black text-gray-900">{files.length} images ready</p>
                                    <div className="flex gap-3 text-xs text-gray-600 mt-0.5">
                                        <span>Original: <strong>{formatSize(totalOriginalBytes)}</strong></span>
                                        {totalCompressedSize > 0 ? (
                                            <span className="text-green-600">
                                                Compressed: <strong>{formatSize(totalCompressedSize)}</strong>
                                                <span className="ml-1.5 bg-green-100 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                                    -{Math.round((1 - totalCompressedSize / totalOriginalBytes) * 100)}%
                                                </span>
                                            </span>
                                        ) : (
                                            <span>Est: ~{estimatedMB.toFixed(0)} MB after compress</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {!compressing && (
                                <button onClick={() => { setFiles([]); setDone(false) }} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
                                    <X className="w-4 h-4 text-gray-600" />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Mode toggle */}
                {files.length > 0 && !compressing && (
                    <div className="flex bg-white rounded-xl border border-gray-200 p-1 shadow-sm">
                        <button
                            onClick={() => setIsUploadMode(false)}
                            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all cursor-pointer ${!isUploadMode ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:text-gray-700'}`}
                        >
                            ↓ Download as ZIP
                        </button>
                        <button
                            onClick={() => setIsUploadMode(true)}
                            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all cursor-pointer ${isUploadMode ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:text-gray-700'}`}
                        >
                            ↑ Upload to Event
                        </button>
                    </div>
                )}

                {/* Event selector */}
                {files.length > 0 && isUploadMode && !compressing && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-in slide-in-from-top-2">
                        <label className="block text-xs font-black text-gray-600 uppercase tracking-widest mb-3">Select Event</label>
                        <div className="relative">
                            <select
                                value={selectedEventId}
                                onChange={(e) => setSelectedEventId(e.target.value)}
                                className="w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 appearance-none cursor-pointer text-sm"
                            >
                                <option value="">— Select an event —</option>
                                {events.map(ev => (
                                    <option key={ev.id} value={ev.id}>{ev.event_name || ev.wedding_name}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
                        </div>
                        <p className="text-[10px] text-gray-600 mt-2 px-1">Images will be uploaded to: events/[event-name]-compressed/</p>
                    </div>
                )}

                {/* Progress */}
                {compressing && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-center justify-between mb-3">
                            <span className="font-black text-gray-900">{uploading ? 'Compressing & Uploading…' : 'Compressing…'}</span>
                            <span className="text-blue-600 font-black">{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                            <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                        </div>
                        <p className="text-xs text-gray-600 truncate">{currentFile}</p>
                    </div>
                )}

                {/* Done banner */}
                {done && !compressing && (
                    <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-xl shrink-0">
                            {isUploadMode ? <Check className="w-5 h-5 text-green-600" /> : <Download className="w-5 h-5 text-green-600" />}
                        </div>
                        <div>
                            <p className="font-black text-green-800">{isUploadMode ? 'Upload Complete!' : 'Download started!'}</p>
                            <p className="text-sm text-green-700">
                                {isUploadMode ? 'Images compressed and added to the event.' : 'Your compressed ZIP is downloading.'}
                            </p>
                        </div>
                    </div>
                )}

                {/* Action button */}
                <button
                    onClick={isUploadMode ? handleCompressAndUpload : handleCompress}
                    disabled={files.length === 0 || compressing || (isUploadMode && !selectedEventId)}
                    className={`w-full py-4 font-black rounded-2xl disabled:opacity-40 transition-all text-sm flex items-center justify-center gap-2.5 cursor-pointer shadow-md active:scale-95 ${isUploadMode ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200' : 'bg-amber-400 hover:bg-amber-500 text-gray-900 shadow-amber-200'}`}
                >
                    {compressing
                        ? <><Loader className="w-5 h-5 animate-spin" /> {uploading ? 'Uploading' : 'Compressing'} {progress}%</>
                        : isUploadMode
                            ? <><Upload className="w-5 h-5" /> Compress & Upload to Event</>
                            : <><Zap className="w-5 h-5" /> Compress & Download ZIP</>
                    }
                </button>
            </main>
        </div>
    )
}
