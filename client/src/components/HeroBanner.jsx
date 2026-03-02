import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import gsap from 'gsap'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
)

export default function HeroBanner() {
    const [images, setImages] = useState([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [loading, setLoading] = useState(true)
    const bannerRef = useRef(null)
    const imageRefs = useRef([])

    useEffect(() => {
        fetchBannerImages()
    }, [])

    async function fetchBannerImages() {
        try {
            // 1. Get the "Desktop Banner" category
            const { data: catData, error: catError } = await supabase
                .from('website_categories')
                .select('id')
                .eq('name', 'Desktop Banner')
                .maybeSingle() // Use maybeSingle to avoid PGRST116 if mapping is missing

            if (catError) {
                console.error('Category fetch error:', catError)
                setLoading(false)
                return
            }

            if (!catData) {
                console.warn('Desktop Banner category not found.')
                setLoading(false)
                return
            }

            // 2. Fetch images for that category
            const { data: imgData, error: imgError } = await supabase
                .from('website_category_images')
                .select('*')
                .eq('category_id', catData.id)
                .order('sort_order', { ascending: true })

            if (imgError) throw imgError
            setImages(imgData || [])
        } catch (error) {
            console.error('Error fetching banner images:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (images.length > 0) {
            const timer = setInterval(() => {
                nextSlide()
            }, 5000)
            return () => clearInterval(timer)
        }
    }, [images, currentIndex])

    function nextSlide() {
        const nextIndex = (currentIndex + 1) % images.length
        animateToSlide(nextIndex)
    }

    function prevSlide() {
        const prevIndex = (currentIndex - 1 + images.length) % images.length
        animateToSlide(prevIndex)
    }

    function animateToSlide(index) {
        if (index === currentIndex) return

        const currentImg = imageRefs.current[currentIndex]
        const nextImg = imageRefs.current[index]

        if (!currentImg || !nextImg) return

        gsap.to(currentImg, {
            opacity: 0,
            scale: 1.1,
            duration: 1.5,
            ease: 'power2.inOut'
        })

        gsap.fromTo(nextImg,
            { opacity: 0, scale: 1.2 },
            { opacity: 1, scale: 1, duration: 1.5, ease: 'power2.inOut' }
        )

        setCurrentIndex(index)
    }

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-gray-900">
                <Loader2 className="w-10 h-10 text-white animate-spin" />
            </div>
        )
    }

    if (images.length === 0) {
        return (
            <div className="h-screen w-full bg-gray-900 flex items-center justify-center text-white p-6 text-center">
                <div>
                    <h2 className="text-2xl font-bold mb-2">Welcome to Fotokaran</h2>
                    <p className="text-gray-400">Add images to the "Desktop Banner" category in your dashboard to see the hero slider.</p>
                </div>
            </div>
        )
    }

    return (
        <section ref={bannerRef} className="relative h-screen w-full overflow-hidden bg-white">
            {images.map((img, i) => (
                <div
                    key={img.id}
                    ref={el => imageRefs.current[i] = el}
                    className="absolute inset-0 w-full h-full"
                    style={{
                        opacity: i === currentIndex ? 1 : 0,
                        zIndex: i === currentIndex ? 10 : 0
                    }}
                >
                    <img
                        src={img.image_url}
                        alt={img.alt_text || 'Premium Photography'}
                        className="w-full h-full object-cover"
                    />
                </div>
            ))}

            {/* Navigation Arrows */}
            {images.length > 1 && (
                <>
                    <button
                        onClick={prevSlide}
                        className="absolute left-6 top-1/2 -translate-y-1/2 z-30 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-full transition-all border border-white/20"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                        onClick={nextSlide}
                        className="absolute right-6 top-1/2 -translate-y-1/2 z-30 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-full transition-all border border-white/20"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </>
            )}

            {/* Navigation Dots */}
            {images.length > 1 && (
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 flex gap-3">
                    {images.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => animateToSlide(i)}
                            className={`h-1.5 rounded-full transition-all duration-500 ${i === currentIndex ? 'w-8 bg-white' : 'w-2 bg-white/40'
                                }`}
                        />
                    ))}
                </div>
            )}

        </section>
    )
}
