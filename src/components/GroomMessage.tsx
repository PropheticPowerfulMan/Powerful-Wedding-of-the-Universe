import { useEffect, useRef } from 'react';
import { Quote } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function GroomMessage() {
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();
  const g = t.groomMessage;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="relative py-24 px-6 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-navy/10 to-black" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gold/4 blur-3xl" />

      <div className="relative z-10 max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <span className="font-cormorant text-gold/60 text-sm tracking-widest uppercase">
            {g.eyebrow}
          </span>
          <h2 className="font-cinzel text-4xl md:text-5xl font-bold text-white mt-2 mb-4">
            {g.title}
          </h2>
          <div className="flex items-center justify-center gap-4">
            <div className="h-px w-20 bg-gradient-to-r from-transparent to-gold/50" />
            <div className="w-2 h-2 rounded-full bg-gold" />
            <div className="h-px w-20 bg-gradient-to-l from-transparent to-gold/50" />
          </div>
        </div>

        <div
          ref={ref}
          style={{
            opacity: 0,
            transform: 'translateY(40px)',
            transition: 'opacity 1s ease, transform 1s ease',
          }}
          className="relative border border-gold/25 rounded-2xl p-8 md:p-12 backdrop-blur-sm bg-gradient-to-br from-navy/15 via-black/60 to-black/70 overflow-hidden"
        >
          <div className="absolute top-6 left-6 opacity-10">
            <Quote className="w-16 h-16 text-gold" />
          </div>
          <div className="absolute bottom-6 right-6 opacity-10 rotate-180">
            <Quote className="w-16 h-16 text-gold" />
          </div>

          <div className="relative z-10 space-y-5 font-cormorant text-white/70 text-lg leading-loose">
            <p>{g.paragraphs[0]}</p>
            <p>{g.paragraphs[1]}</p>
            <p>
              {g.paragraphs[2]}
              <span className="text-gold font-semibold"> {g.powerfully}</span>.
            </p>
            <p>{g.paragraphs[3]}</p>
            <p className="text-white/50 italic">{g.paragraphs[4]}</p>
          </div>

          <div className="relative z-10 mt-10 pt-6 border-t border-gold/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center">
                <span className="font-cinzel text-gold text-lg font-bold">JL</span>
              </div>
              <div>
                <p className="font-cinzel text-gold text-base font-bold">Jonathan Lokala, Lomboto</p>
                <p className="font-cormorant text-white/45 text-sm tracking-wider italic">
                  {g.subtitle}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
