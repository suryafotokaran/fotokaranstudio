import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { S3Client, PutObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3'
import { Upload, ArrowLeft, Loader, Image as ImageIcon, X, Trash2, CheckSquare, Square, Check, Heart, Download, FolderOpen, Package, Eye, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import JSZip from 'jszip'

const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  serviceKey || anonKey,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export default function EventDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [event, setEvent] = useState(null)
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadCurrentFile, setUploadCurrentFile] = useState('')
  const [uploadedCount, setUploadedCount] = useState(0)
  const [selectedFiles, setSelectedFiles] = useState([])
  const cancelRef = useRef(false)

  // Batch Selection State
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteProgress, setDeleteProgress] = useState(0)

  // Tab State: 'gallery' | 'selections' | 'delivery'
  const [activeTab, setActiveTab] = useState('gallery')
  const [filterStatus, setFilterStatus] = useState('selected')

  // Fullscreen Viewer State
  const [viewingImage, setViewingImage] = useState(null)

  // Delivery tab state
  const [originalsMap, setOriginalsMap] = useState({}) // filename -> File object
  const [originalsFolderName, setOriginalsFolderName] = useState('')
  const [zipping, setZipping] = useState(false)
  const [zipProgress, setZipProgress] = useState(0)
  const originalsInputRef = useRef(null)

  useEffect(() => {
    fetchEventDetails()
    fetchImages()
  }, [id])

  async function fetchEventDetails() {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      setEvent(data)
    } catch (error) {
      console.error('Error fetching event:', error)
      toast.error('Failed to load event details')
    } finally {
      setLoading(false)
    }
  }

  async function fetchImages() {
    try {
      const { data, error } = await supabase
        .from('event_images')
        .select('*')
        .eq('event_id', id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setImages(data || [])
    } catch (error) {
      console.error('Error fetching images:', error)
      toast.error('Failed to load images')
    }
  }

  // Supported photo extensions (browser-native + camera RAW)
  const ALLOWED_EXT = new Set([
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'bmp', 'tiff', 'tif',
    'heic', 'heif', 'raw', 'cr2', 'nef', 'arw', 'dng'
  ])
  function isPhotoFile(file) {
    const ext = file.name.split('.').pop().toLowerCase()
    return ALLOWED_EXT.has(ext)
  }

  // Extract just the filename from a URL or path
  function extractFilename(imageUrl) {
    try {
      // 1. Get the path part after the last slash
      const url = new URL(imageUrl)
      const encodedFilename = url.pathname.split('/').pop()
      // 2. Decode URL characters (%20 -> space, etc)
      const decoded = decodeURIComponent(encodedFilename)
      // 3. Normalize all types of spaces (handled U+202F Narrow No-Break Space in screenshots)
      return decoded.replace(/\s/g, ' ')
    } catch {
      const parts = imageUrl.split('/')
      return decodeURIComponent(parts[parts.length - 1]).replace(/\s/g, ' ')
    }
  }

  // ── Upload handlers ──────────────────────────────────────────────
  function handleFileSelect(e) {
    if (e.target.files) {
      const all = Array.from(e.target.files)
      const imageFiles = all.filter(isPhotoFile)
      const skipped = all.length - imageFiles.length
      if (skipped > 0) toast.warning(`Skipped ${skipped} non-photo file${skipped > 1 ? 's' : ''}`)
      setSelectedFiles(imageFiles)
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    e.stopPropagation()
    const droppedFiles = Array.from(e.dataTransfer.files)
    const imageFiles = droppedFiles.filter(isPhotoFile)
    const skipped = droppedFiles.length - imageFiles.length
    if (skipped > 0) toast.warning(`Skipped ${skipped} non-photo file${skipped > 1 ? 's' : ''}`)
    if (imageFiles.length > 0) setSelectedFiles(imageFiles)
  }

  async function handleUpload() {
    if (selectedFiles.length === 0) return

    const accessKeyId = import.meta.env.VITE_AWS_ACCESS_KEY_ID
    const secretAccessKey = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY
    const region = import.meta.env.VITE_AWS_REGION
    const bucketName = import.meta.env.VITE_AWS_BUCKET_NAME

    if (!accessKeyId || !secretAccessKey || !region || !bucketName) {
      toast.error('AWS credentials missing. Check .env.local')
      return
    }

    cancelRef.current = false
    setUploading(true)
    setUploadProgress(0)
    setUploadedCount(0)
    setUploadCurrentFile('')

    try {
      const s3Client = new S3Client({ region, credentials: { accessKeyId, secretAccessKey } })
      const sanitize = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      const folderName = sanitize(event.wedding_name)

      let uploaded = 0
      for (const file of selectedFiles) {
        // Check if cancelled before each file
        if (cancelRef.current) break

        setUploadCurrentFile(file.name)
        const key = `events/${folderName}/${file.name}`
        const arrayBuffer = await file.arrayBuffer()
        await s3Client.send(new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: new Uint8Array(arrayBuffer),
          ContentType: file.type,
        }))
        const s3Url = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`
        await supabase.from('event_images').insert({ event_id: id, image_url: s3Url })
        uploaded++
        setUploadedCount(uploaded)
        setUploadProgress(Math.round((uploaded / selectedFiles.length) * 100))
      }

      if (cancelRef.current) {
        toast.info(`Cancelled — ${uploaded} of ${selectedFiles.length} photo${uploaded !== 1 ? 's' : ''} uploaded`)
      } else {
        toast.success(`${uploaded} photo${uploaded !== 1 ? 's' : ''} uploaded!`)
      }
      await fetchImages()
      setSelectedFiles([])
      const input = document.getElementById('file-upload')
      if (input) input.value = ''
    } catch (error) {
      toast.error(`Upload failed: ${error.message}`)
    } finally {
      setUploading(false)
      setUploadProgress(0)
      setUploadCurrentFile('')
      cancelRef.current = false
    }
  }

  // ── Batch delete ─────────────────────────────────────────────────
  function toggleSelection(imageId) {
    const next = new Set(selectedIds)
    next.has(imageId) ? next.delete(imageId) : next.add(imageId)
    setSelectedIds(next)
  }

  function selectAll() {
    const visible = activeTab === 'gallery' ? images : filteredImages
    setSelectedIds(selectedIds.size === visible.length ? new Set() : new Set(visible.map(i => i.id)))
  }

  async function handleDeleteConfirm() {
    const accessKeyId = import.meta.env.VITE_AWS_ACCESS_KEY_ID
    const secretAccessKey = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY
    const region = import.meta.env.VITE_AWS_REGION
    const bucketName = import.meta.env.VITE_AWS_BUCKET_NAME

    setDeleting(true)
    setDeleteProgress(0)
    const toastId = toast.loading('Starting deletion...')
    try {
      const idsArr = Array.from(selectedIds)
      const toDelete = images.filter(img => idsArr.includes(img.id))
      const totalSteps = idsArr.length + (bucketName ? 1 : 0)
      let currentStep = 0

      // 1. Delete from DB (One by one for progress tracking, or batch if preferred)
      // We'll do it one by one to show a smooth progress bar
      for (const imgId of idsArr) {
        const { error } = await supabase.from('event_images').delete().eq('id', imgId)
        if (error) throw error
        currentStep++
        setDeleteProgress(Math.round((currentStep / totalSteps) * 100))
      }

      // 2. Delete from S3
      if (accessKeyId && secretAccessKey && region && bucketName) {
        const s3Client = new S3Client({ region, credentials: { accessKeyId, secretAccessKey } })
        const objects = toDelete.map(img => {
          try { return { Key: decodeURIComponent(new URL(img.image_url).pathname.substring(1)) } }
          catch { return null }
        }).filter(Boolean)

        if (objects.length > 0) {
          await s3Client.send(new DeleteObjectsCommand({
            Bucket: bucketName,
            Delete: { Objects: objects, Quiet: true }
          }))
        }
        currentStep++
        setDeleteProgress(100)
      }

      setImages(prev => prev.filter(img => !idsArr.includes(img.id)))
      setSelectedIds(new Set())
      toast.success(`Successfully deleted ${idsArr.length} images`, { id: toastId })
      setIsDeleteModalOpen(false) // Only close on success
    } catch (error) {
      console.error('Delete error:', error)
      toast.error(`Delete failed: ${error.message}`, { id: toastId })
    } finally {
      setDeleting(false)
      setDeleteProgress(0)
    }
  }

  // ── Delivery tab ─────────────────────────────────────────────────
  function handleOriginalsLoad(e) {
    const files = Array.from(e.target.files || [])
    if (files.length > 0 && files[0].webkitRelativePath) {
      const folderName = files[0].webkitRelativePath.split('/')[0]
      setOriginalsFolderName(folderName)
    }
    const imageFiles = files.filter(isPhotoFile)
    const map = {}
    for (const f of imageFiles) {
      // Normalize local filename spaces just in case
      const name = f.name.replace(/\s/g, ' ')
      console.log('Originals Load - Filename:', f.name, 'Normalized:', name)
      // Store by full name
      map[name] = f
      // Also store by lowercase basename (e.g. "IMG_001.JPG" -> "img_001")
      const basename = name.replace(/\.[^.]+$/, '').toLowerCase()
      map[basename] = f
      // Also handle original name stripped of leading timestamp if present
      const stripped = name.replace(/^\d+-/, '')
      if (stripped !== name) {
        map[stripped] = f
        map[stripped.replace(/\.[^.]+$/, '').toLowerCase()] = f
      }
    }
    console.log('Originals Map Keys:', Object.keys(map))
    setOriginalsMap(map)
    toast.success(`Loaded ${imageFiles.length} originals into memory`)
  }

  const selectedImages = images.filter(img => img.status === 'selected')

  // Match selected S3 images against loaded originals by filename
  const matchedFiles = selectedImages.map(img => {
    const s3Filename = extractFilename(img.image_url)
    const s3Basename = s3Filename.replace(/\.[^.]+$/, '').toLowerCase()

    // Try matching: 1. Exact name, 2. Base name, 3. Base name without possible timestamp
    const file = originalsMap[s3Filename] ||
      originalsMap[s3Basename] ||
      originalsMap[s3Basename.replace(/^\d+-/, '')]

    console.log('Matching Debug:', {
      s3Url: img.image_url,
      extractedFilename: s3Filename,
      extractedBasename: s3Basename,
      foundMatch: !!file
    })

    return { img, file, s3Filename, matched: !!file }
  })
  const matchedCount = matchedFiles.filter(m => m.matched).length

  async function handleDownloadZip() {
    const toZip = matchedFiles.filter(m => m.matched)
    if (toZip.length === 0) {
      toast.error('No matched originals to download')
      return
    }
    setZipping(true)
    setZipProgress(0)
    const toastId = toast.loading('Creating ZIP...')
    try {
      const zip = new JSZip()
      const folder = zip.folder(originalsFolderName || 'delivery_selected')
      let done = 0
      for (const { file } of toZip) {
        const buffer = await file.arrayBuffer()
        folder.file(file.name, buffer)
        done++
        setZipProgress(Math.round((done / toZip.length) * 100))
      }
      const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' }, (meta) => {
        setZipProgress(Math.round(meta.percent))
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const timestamp = new Date().toISOString().split('T')[0]
      a.download = `Delivery_${originalsFolderName || event.wedding_name}_${timestamp}.zip`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Downloaded ZIP with ${toZip.length} originals`, { id: toastId })
    } catch (error) {
      toast.error(`ZIP failed: ${error.message}`, { id: toastId })
    } finally {
      setZipping(false)
      setZipProgress(0)
    }
  }

  // ── Derived state ─────────────────────────────────────────────────
  const filteredImages = images.filter(img => {
    if (filterStatus === 'selected') return img.status === 'selected'
    return !img.status || img.status === 'none' || img.status === 'pending'
  })

  const selectedCount = images.filter(img => img.status === 'selected').length
  const pendingCount = images.filter(img => !img.status || img.status === 'none' || img.status === 'pending').length

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-2 text-gray-900 text-xl font-medium">
          <Loader className="w-6 h-6 animate-spin text-blue-600" />
          Loading event details...
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Event Not Found</h2>
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 mx-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all">
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 relative">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6 md:mb-8">
          <button onClick={() => navigate(-1)} className="p-2 bg-white hover:bg-gray-100 text-gray-600 rounded-lg border border-gray-200 transition-all cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">{event.wedding_name}</h1>
            <p className="text-gray-600 text-sm md:text-base">{images.length} photos · {selectedCount} selected</p>
          </div>

          {/* Tabs */}
          <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm self-stretch sm:self-auto">
            {[
              { key: 'gallery', label: 'All Photos' },
              { key: 'selections', label: 'Selections' },
              { key: 'delivery', label: '📦 Delivery' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setSelectedIds(new Set()) }}
                className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer ${activeTab === tab.key ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── GALLERY TAB ── */}
        {activeTab === 'gallery' && (
          <div className="grid gap-6 lg:grid-cols-4">
            {/* Upload Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sticky top-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Upload className="w-5 h-5" /></div>
                  <h2 className="text-lg font-bold text-gray-900">Upload Photos</h2>
                </div>

                <div className="space-y-4">
                  <div
                    className="relative border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer group"
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-blue-500', 'bg-blue-50') }}
                    onDragLeave={(e) => { e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50') }}
                    onDrop={(e) => { e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50'); handleDrop(e) }}
                  >
                    <input
                      type="file"
                      id="file-upload"
                      multiple
                      webkitdirectory=""
                      directory=""
                      accept=".jpg,.jpeg,.png,.gif,.webp,.avif,.bmp,.tiff,.tif,.heic,.heif,.raw,.cr2,.nef,.arw,.dng"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={handleFileSelect}
                    />
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-2 bg-gray-100 rounded-full group-hover:bg-blue-100 transition-colors">
                        <ImageIcon className="w-6 h-6 text-gray-600 group-hover:text-blue-500 transition-colors" />
                      </div>
                      <p className="font-medium text-gray-900 text-sm">Drop folder or click to browse</p>
                      <p className="text-[10px] text-gray-600">JPEG, PNG, HEIC, HEIF, RAW, CR2, NEF, ARW, DNG supported</p>
                    </div>
                  </div>

                  {selectedFiles.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-700">{selectedFiles.length} images ready</span>
                        <button onClick={() => setSelectedFiles([])} className="text-xs text-red-600 font-medium">Clear</button>
                      </div>
                      <ul className="text-[10px] text-gray-600 space-y-1 max-h-32 overflow-y-auto">
                        {selectedFiles.slice(0, 10).map((file, i) => (
                          <li key={i} className="truncate">• {file.name}</li>
                        ))}
                        {selectedFiles.length > 10 && <li>...and {selectedFiles.length - 10} more</li>}
                      </ul>
                    </div>
                  )}

                  {/* Progress bar (visible while uploading) */}
                  {uploading && (
                    <div className="space-y-2">
                      {/* File name */}
                      <div className="flex items-center justify-between text-[10px] text-gray-600">
                        <span className="truncate max-w-[70%]" title={uploadCurrentFile}>
                          {uploadCurrentFile || 'Starting…'}
                        </span>
                        <span className="font-semibold text-blue-600">
                          {uploadedCount}/{selectedFiles.length}
                        </span>
                      </div>

                      {/* Bar */}
                      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>

                      <p className="text-center text-xs font-semibold text-blue-600">{uploadProgress}%</p>

                      {/* Cancel button */}
                      <button
                        onClick={() => { cancelRef.current = true }}
                        className="w-full py-2 bg-white hover:bg-red-50 text-red-600 font-semibold rounded-lg border border-red-200 hover:border-red-300 text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <X className="w-4 h-4" /> Cancel Upload
                      </button>
                    </div>
                  )}

                  {/* Upload button (hidden while uploading) */}
                  {!uploading && (
                    <button
                      onClick={handleUpload}
                      disabled={selectedFiles.length === 0}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50 transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      Upload {selectedFiles.length > 0 ? selectedFiles.length : ''} Photos
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Gallery Grid */}
            <div className="lg:col-span-3 space-y-4">
              <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-4">
                  <h3 className="font-bold text-gray-900">All Photos</h3>
                  <div className="hidden sm:flex gap-3 text-xs text-gray-600">
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3 fill-green-500 text-green-500" /> {selectedCount} Selected</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={selectAll} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors cursor-pointer">
                    {selectedIds.size === images.length && images.length > 0 ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-gray-600" />}
                    Select All
                  </button>
                  {selectedIds.size > 0 && (
                    <button onClick={() => setIsDeleteModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 font-medium rounded-lg hover:bg-red-100 transition-colors text-sm cursor-pointer">
                      <Trash2 className="w-4 h-4" /> Delete ({selectedIds.size})
                    </button>
                  )}
                </div>
              </div>

              {images.length === 0
                ? <EmptyState icon={<ImageIcon />} title="No photos yet" description="Upload a folder of compressed photos to get started." />
                : <ImageGrid images={images} selectedIds={selectedIds} toggleSelection={toggleSelection} setViewingImage={setViewingImage} />
              }
            </div>
          </div>
        )}

        {/* ── SELECTIONS TAB ── */}
        {activeTab === 'selections' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm px-6">
              <div className="flex flex-wrap gap-2">
                <StatusFilterButton active={filterStatus === 'selected'} onClick={() => setFilterStatus('selected')} icon={<Heart className={`w-4 h-4 ${filterStatus === 'selected' ? 'fill-current' : ''}`} />} label="Selected" count={selectedCount} color="green" />
                <StatusFilterButton active={filterStatus === 'pending'} onClick={() => setFilterStatus('pending')} icon={<Loader className="w-4 h-4" />} label="Pending" count={pendingCount} color="blue" />
              </div>
              <div className="flex items-center gap-3">
                <button onClick={selectAll} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors cursor-pointer">
                  {selectedIds.size === filteredImages.length && filteredImages.length > 0 ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-gray-600" />}
                  Select Visible
                </button>
                {selectedIds.size > 0 && (
                  <button onClick={() => setIsDeleteModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 font-medium rounded-lg hover:bg-red-100 transition-colors text-sm cursor-pointer">
                    <Trash2 className="w-4 h-4" /> Delete ({selectedIds.size})
                  </button>
                )}
              </div>
            </div>

            {filteredImages.length === 0
              ? <EmptyState icon={filterStatus === 'selected' ? <Heart /> : <Loader />} title={`No ${filterStatus} images`} description={`Client hasn't ${filterStatus === 'pending' ? 'left any images pending' : `${filterStatus} any images yet`}.`} />
              : <ImageGrid images={filteredImages} selectedIds={selectedIds} toggleSelection={toggleSelection} setViewingImage={setViewingImage} />
            }
          </div>
        )}

        {/* ── DELIVERY TAB ── */}
        {activeTab === 'delivery' && (
          <div className="space-y-6">
            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex gap-4 items-start">
              <Package className="w-6 h-6 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-bold text-blue-900 mb-1">How Delivery Works</h3>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Client selects photos on the website ({selectedCount} selected so far)</li>
                  <li>Click <strong>"Load Originals Folder"</strong> → pick your high-res originals folder (stays on your Mac, nothing uploads)</li>
                  <li>App matches selected filenames automatically</li>
                  <li>Click <strong>"Download as ZIP"</strong> → get a ZIP with only the selected originals</li>
                </ol>
              </div>
            </div>

            {/* Step 1: Load Originals */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Step 1 — Load Originals Folder</h3>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {Object.keys(originalsMap).length > 0
                      ? `✅ ${Object.keys(originalsMap).length} originals loaded in memory`
                      : 'Pick your local high-res originals folder — files stay on your Mac'}
                  </p>
                </div>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white font-medium rounded-xl cursor-pointer hover:bg-gray-700 transition-all text-sm">
                    <FolderOpen className="w-4 h-4" />
                    {Object.keys(originalsMap).length > 0 ? 'Change Folder' : 'Load Originals Folder'}
                    <input
                      ref={originalsInputRef}
                      type="file"
                      multiple
                      webkitdirectory=""
                      directory=""
                      className="hidden"
                      onChange={handleOriginalsLoad}
                    />
                  </label>
                  {Object.keys(originalsMap).length > 0 && (
                    <button onClick={() => setOriginalsMap({})} className="px-4 py-2.5 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-all text-sm cursor-pointer">
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Step 2: Match & Download */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Step 2 — Download Selected Originals</h3>
                  {Object.keys(originalsMap).length > 0 ? (
                    <p className="text-sm mt-0.5">
                      <span className="text-green-600 font-semibold">{matchedCount} matched</span>
                      <span className="text-gray-600"> / {selectedImages.length} selected</span>
                      {matchedCount < selectedImages.length && (
                        <span className="text-orange-500 ml-2">· {selectedImages.length - matchedCount} not found in folder</span>
                      )}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-600 mt-0.5">Load originals folder first</p>
                  )}
                </div>
                <button
                  onClick={handleDownloadZip}
                  disabled={matchedCount === 0 || zipping}
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl disabled:opacity-40 transition-all text-sm cursor-pointer"
                >
                  {zipping ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {zipping ? `Zipping ${zipProgress}%` : `Download ${matchedCount} Originals as ZIP`}
                </button>
              </div>

              {/* Selected images preview */}
              {selectedImages.length === 0 ? (
                <EmptyState icon={<Heart />} title="No selected photos yet" description="Client needs to select photos first before you can prepare delivery." />
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                  {matchedFiles.map(({ img, matched, s3Filename }) => (
                    <div key={img.id} className={`relative aspect-square rounded-lg overflow-hidden border-2 ${matched ? 'border-green-400' : 'border-orange-300'}`}>
                      <img src={img.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      <div className={`absolute inset-0 flex items-end justify-center pb-1 ${matched ? 'bg-green-900/10' : 'bg-orange-900/20'}`}>
                        <span className={`text-[8px] font-bold px-1 rounded ${matched ? 'bg-green-500 text-white' : 'bg-orange-400 text-white'}`}>
                          {matched ? '✓' : '?'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Viewer */}
      <ImageFullscreenModal
        image={viewingImage}
        images={activeTab === 'gallery' ? images : filteredImages}
        onClose={() => setViewingImage(null)}
        onNavigate={(newImg) => setViewingImage(newImg)}
        onToggleSelection={toggleSelection}
        selectedIds={selectedIds}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        count={selectedIds.size}
        isLoading={deleting}
        progress={deleteProgress}
      />
    </div>
  )
}

function ImageFullscreenModal({ image, images, onClose, onNavigate, onToggleSelection, selectedIds }) {
  const currentIndex = images.findIndex(img => img.id === image?.id)

  useEffect(() => {
    if (!image) return
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') handleNext()
      if (e.key === 'ArrowLeft') handlePrev()
      if (e.key === 'Escape') onClose()
      if (e.code === 'Space') {
        e.preventDefault()
        onToggleSelection(image.id)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [image, images, currentIndex, onToggleSelection])

  if (!image) return null

  const isSelected = selectedIds.has(image.id)

  const handleNext = () => {
    const nextIdx = (currentIndex + 1) % images.length
    onNavigate(images[nextIdx])
  }

  const handlePrev = () => {
    const prevIdx = (currentIndex - 1 + images.length) % images.length
    onNavigate(images[prevIdx])
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-200 select-none">
      {/* Top Actions */}
      <div className="absolute top-4 right-4 flex items-center gap-3 z-[110]">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleSelection(image.id)
          }}
          className={`p-3 rounded-xl border transition-all cursor-pointer backdrop-blur-md ${isSelected
            ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/30 scale-110'
            : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
            }`}
          title="Toggle Selection (Space)"
        >
          <Check className={`w-6 h-6 ${isSelected ? 'stroke-[3]' : ''}`} />
        </button>
        <button
          onClick={onClose}
          className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all cursor-pointer border border-white/20 backdrop-blur-md"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Navigation Arrows */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-4 md:px-8 pointer-events-none z-[110]">
        <button
          onClick={(e) => { e.stopPropagation(); handlePrev() }}
          className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all cursor-pointer border border-white/20 pointer-events-auto backdrop-blur-sm"
        >
          <ChevronLeft className="w-8 h-8 md:w-10 md:h-10" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); handleNext() }}
          className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all cursor-pointer border border-white/20 pointer-events-auto backdrop-blur-sm"
        >
          <ChevronRight className="w-8 h-8 md:w-10 md:h-10" />
        </button>
      </div>

      {/* Image Container */}
      <div className="w-full h-full flex items-center justify-center p-4 md:p-12 relative pointer-events-none">
        <img
          src={image.image_url}
          alt=""
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-all duration-300 pointer-events-auto"
        />

        {/* Info Overlay (Bottom) */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-white text-xs md:text-sm font-medium">
          {currentIndex + 1} / {images.length}
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────

function StatusFilterButton({ active, onClick, icon, label, count, color }) {
  const colorMap = {
    green: active ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100',
    red: active ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100',
    blue: active ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100',
  }
  return (
    <button onClick={onClick} className={`px-4 py-2 text-sm font-medium rounded-xl transition-all flex items-center gap-2 shadow-sm cursor-pointer ${colorMap[color]}`}>
      {icon} <span>{label}</span>
      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20' : 'bg-white shadow-inner'}`}>{count}</span>
    </button>
  )
}

function DeleteConfirmationModal({ isOpen, onClose, onConfirm, count, isLoading, progress }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={!isLoading ? onClose : undefined} />
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative z-10 p-8 animate-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center">
          <div className="p-4 bg-red-100/50 rounded-full mb-4">
            <Trash2 className={`w-10 h-10 text-red-600 ${isLoading ? 'animate-pulse' : ''}`} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {isLoading ? 'Deleting Images...' : 'Confirm Delete'}
          </h3>
          <p className="text-gray-600 mb-8">
            {isLoading
              ? `Please wait while we remove ${count} images from the database and S3.`
              : `Are you sure you want to delete ${count} selected images? This action cannot be undone.`}
          </p>

          {isLoading && (
            <div className="w-full mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-red-600">{progress}% Complete</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-red-600 h-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 w-full">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="py-3.5 px-6 border border-gray-200 text-gray-700 font-semibold rounded-2xl hover:bg-gray-50 transition-all cursor-pointer disabled:opacity-0 disabled:pointer-events-none"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`py-3.5 px-6 bg-red-600 text-white font-semibold rounded-2xl hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-100 col-span-2 sm:col-span-1 ${isLoading ? 'w-full col-span-2' : ''}`}
            >
              {isLoading ? (
                <><Loader className="w-5 h-5 animate-spin" /> Deleting...</>
              ) : (
                'Yes, Delete All'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ImageGrid({ images, selectedIds, toggleSelection, setViewingImage }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {images.map((img) => {
        const isSelected = selectedIds.has(img.id)
        const isAccepted = img.status === 'selected'
        return (
          <div
            key={img.id}
            className={`group relative aspect-square bg-gray-100 rounded-xl overflow-hidden border transition-all ${isSelected ? 'border-blue-500 ring-2 ring-blue-500 ring-offset-2'
              : isAccepted ? 'border-green-400'
                : 'border-gray-200 hover:border-blue-300'
              }`}
          >
            {/* Image itself opens viewer */}
            <img
              src={img.image_url}
              alt=""
              className="w-full h-full object-cover cursor-zoom-in"
              loading="lazy"
              onClick={() => setViewingImage(img)}
            />

            {/* Accepted Badge */}
            <div className="absolute top-2 right-2 flex gap-1 z-10 pointer-events-none">
              {isAccepted && <div className="bg-green-500 text-white p-1 rounded-full shadow-sm"><Heart className="w-2.5 h-2.5 fill-white" /></div>}
            </div>

            {/* Checkbox Overlay (Toggles Selection) */}
            <div
              className={`absolute top-2 left-2 transition-all z-20 cursor-pointer ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
              onClick={(e) => {
                e.stopPropagation()
                toggleSelection(img.id)
              }}
            >
              <div className={`p-1 rounded-lg ${isSelected ? 'bg-blue-600 text-white' : 'bg-white/90 text-gray-600 shadow-sm hover:text-blue-600'}`}>
                <Check className="w-4 h-4" />
              </div>
            </div>

            {/* Hover Actions (Centered Zoom Icon) */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="bg-white/20 backdrop-blur-[2px] p-3 rounded-full text-white">
                <Maximize2 className="w-6 h-6" />
              </div>
            </div>

            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none" />
          </div>
        )
      })}
    </div>
  )
}

function EmptyState({ icon, title, description }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center flex flex-col items-center justify-center">
      <div className="p-4 bg-gray-50 rounded-full mb-4 text-gray-600">{icon}</div>
      <h3 className="text-gray-900 font-medium mb-1">{title}</h3>
      <p className="text-gray-600 text-sm max-w-xs">{description}</p>
    </div>
  )
}
