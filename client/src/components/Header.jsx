import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Menu, X, Camera } from 'lucide-react'

gsap.registerPlugin(ScrollTrigger)

const NAV_LINKS = [
    { label: 'Home', to: '/' },
    { label: 'Gallery', to: '/gallery' },
    { label: 'My Photos', to: '/home' },
    { label: 'About Us', to: '/about' },
]

// resolve which nav index is "active" based on the current path
// returns -1 if the current page is not a nav route
function getActiveIndex(pathname) {
    if (pathname === '/home' || pathname === '/signin' || pathname.startsWith('/event/')) {
        return 2 // 'My Photos' index
    }
    return NAV_LINKS.findIndex(({ to }) => to === pathname)
}

export default function Header() {
    const headerRef = useRef(null)
    const navRef = useRef(null)
    const pillRef = useRef(null)
    const itemRefs = useRef([])          // one ref per nav item
    const location = useLocation()
    const navigate = useNavigate()
    const [menuOpen, setMenuOpen] = useState(false)

    /* ── GSAP: directionally-aware header hide / show on scroll ── */
    useEffect(() => {
        const header = headerRef.current
        if (!header) return

        let lastY = 0
        let hidden = false

        const showHeader = () => {
            if (hidden) {
                gsap.to(header, { yPercent: 0, duration: 0.4, ease: 'power2.out', overwrite: 'auto' })
                hidden = false
            }
        }
        const hideHeader = () => {
            if (!hidden) {
                gsap.to(header, { yPercent: -110, duration: 0.35, ease: 'power2.in', overwrite: 'auto' })
                hidden = true
            }
        }

        const st = ScrollTrigger.create({
            start: 0, end: 99999,
            onUpdate: (self) => {
                const currentY = self.scroll()
                const diff = currentY - lastY
                if (currentY < 80) showHeader()
                else if (diff > 3) hideHeader()
                else if (diff < -3) showHeader()
                lastY = currentY
            },
        })

        return () => st.kill()
    }, [])

    /* ── GSAP: sliding pill between nav items ─────────────────── */
    useEffect(() => {
        const pill = pillRef.current
        const nav = navRef.current
        if (!pill || !nav) return

        const idx = getActiveIndex(location.pathname)
        const target = itemRefs.current[idx]

        // No matching nav route → hide the pill
        if (!target) {
            gsap.to(pill, { opacity: 0, duration: 0.25, overwrite: 'auto' })
            return
        }

        const navBox = nav.getBoundingClientRect()
        const btnBox = target.getBoundingClientRect()
        const left = btnBox.left - navBox.left
        const width = btnBox.width

        // On first paint: position without animation
        const isFirst = pill.dataset.initialized !== 'true'
        if (isFirst) {
            gsap.set(pill, { x: left, width, opacity: 1 })
            pill.dataset.initialized = 'true'
        } else {
            gsap.to(pill, {
                x: left,
                width,
                opacity: 1,
                duration: 0.4,
                ease: 'power3.inOut',
                overwrite: 'auto',
            })
        }
    }, [location.pathname])

    const activeIdx = getActiveIndex(location.pathname)

    return (
        <header
            ref={headerRef}
            className="fixed top-0 left-0 right-0 z-50 px-4 py-3 flex items-center justify-between"
            style={{
                background: 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                borderBottom: '1px solid rgba(0,0,0,0.07)',
                willChange: 'transform',
            }}
        >
            {/* ── Logo ────────────────────────────────── */}
            <Link
                to="/"
                className="flex items-center gap-2 text-gray-900 font-bold text-lg select-none no-underline"
                style={{ textDecoration: 'none' }}
            >
                <span className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-900 text-white">
                    <Camera size={18} />
                </span>
                <span className="hidden sm:block tracking-tight text-xl uppercase font-black text-gray-900">Fotokaran</span>
            </Link>

            {/* ── Desktop Nav with sliding pill ────────── */}
            <nav
                ref={navRef}
                className="hidden md:flex items-center gap-1 px-5 py-2 rounded-full bg-white/70 border border-gray-200 shadow-sm backdrop-blur"
                style={{ position: 'relative' }}
            >
                {/* animated background pill */}
                <span
                    ref={pillRef}
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: 0,
                        transform: 'translateY(-50%)',
                        height: 'calc(100% - 8px)',
                        borderRadius: '9999px',
                        backgroundColor: '#111827',  /* gray-900 */
                        zIndex: 0,
                        pointerEvents: 'none',
                    }}
                />

                {NAV_LINKS.map(({ label, to }, i) => {
                    const isActive = i === activeIdx
                    const cls = `relative z-10 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors duration-200 cursor-pointer no-underline ${isActive ? 'text-white' : 'text-gray-600 hover:text-gray-900'
                        }`
                    return (
                        <Link
                            key={label}
                            to={to}
                            ref={(el) => (itemRefs.current[i] = el)}
                            className={cls}
                        >
                            {label}
                        </Link>
                    )
                })}
            </nav>

            {/* ── CTA + Mobile burger ───────────────────── */}
            <div className="flex items-center gap-3">
                <Link
                    to="/contact"
                    className="hidden md:inline-flex items-center px-6 py-2 rounded-lg bg-gray-900 text-white text-sm font-bold shadow-lg hover:bg-gray-700 transition-all no-underline"
                >
                    Get Quote
                </Link>

                <button
                    className="md:hidden p-2 rounded-lg text-gray-900 hover:bg-gray-100 transition-all"
                    onClick={() => setMenuOpen((o) => !o)}
                    aria-label="Toggle menu"
                >
                    {menuOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
            </div>

            {/* ── Mobile Dropdown ───────────────────────── */}
            {menuOpen && (
                <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-lg px-4 py-4 flex flex-col gap-2">
                    {NAV_LINKS.map(({ label, to }) => (
                        <Link
                            key={label}
                            to={to}
                            onClick={() => setMenuOpen(false)}
                            className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-all no-underline"
                        >
                            {label}
                        </Link>
                    ))}
                    <Link
                        to="/contact"
                        onClick={() => setMenuOpen(false)}
                        className="mt-2 px-4 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-semibold text-center no-underline hover:bg-gray-700 transition-all"
                    >
                        Get Quote
                    </Link>
                </div>
            )}
        </header>
    )
}
