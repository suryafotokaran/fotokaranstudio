import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export default function About() {
    const sectionRef = useRef(null)
    const textRef = useRef(null)

    useEffect(() => {
        const textElement = textRef.current
        if (!textElement) return

        // ── Custom Word Splitting ──
        // Since we don't have SplitText (paid), we'll do it manually.
        // We wrap each word (and potentially letters) in spans to animate them individually.
        const originalText = textElement.innerText
        const words = originalText.split(' ')

        textElement.innerHTML = words
            .map(word => `<span class="inline-block overflow-hidden"><span class="word inline-block">${word}</span></span>`)
            .join(' ')

        const wordSpans = textElement.querySelectorAll('.word')

        // ── GSAP Animation ──
        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: sectionRef.current,
                start: 'top 80%',
                end: 'bottom 20%',
                toggleActions: 'play none none reverse',
            }
        })

        tl.fromTo(wordSpans,
            { y: '100%', opacity: 0 },
            {
                y: '0%',
                opacity: 1,
                duration: 1.2,
                stagger: 0.05,
                ease: 'power4.out'
            }
        )

        return () => {
            if (ScrollTrigger.getById('about-trigger')) {
                ScrollTrigger.getById('about-trigger').kill()
            }
        }
    }, [])

    return (
        <section
            ref={sectionRef}
            className="min-h-screen flex flex-col items-center justify-center bg-white text-gray-900 px-6 py-24 overflow-hidden"
        >
            <div className="max-w-4xl w-full text-center">
                <span className="block text-blue-600 uppercase tracking-[0.4em] font-bold text-sm mb-6 animate-pulse">
                    Our Legacy
                </span>

                <h2
                    ref={textRef}
                    className="text-4xl md:text-7xl font-black tracking-tighter leading-[1.1] mb-12"
                >
                    From Surya Photo Studio to Fotokaran Studio — we capture lifetime stories with passion and precision.
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mt-12 pt-12 border-t border-gray-100">
                    <div>
                        <h4 className="text-3xl font-bold mb-2">15+</h4>
                        <p className="text-gray-500 text-sm uppercase tracking-widest">Years Experience</p>
                    </div>
                    <div>
                        <h4 className="text-3xl font-bold mb-2">500+</h4>
                        <p className="text-gray-500 text-sm uppercase tracking-widest">Events Captured</p>
                    </div>
                    <div>
                        <h4 className="text-3xl font-bold mb-2">100%</h4>
                        <p className="text-gray-500 text-sm uppercase tracking-widest">Client Satisfaction</p>
                    </div>
                </div>
            </div>
        </section>
    )
}
