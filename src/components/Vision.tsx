import { useEffect, useRef } from 'react';
import { Cross, Target, BookOpen, Zap, type LucideIcon } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const pillarIcons: LucideIcon[] = [Cross, Target, BookOpen, Zap];

export default function Vision() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const { t } = useLanguage();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('vision-visible');
          }
        });
      },
      { threshold: 0.1 }
    );

    cardsRef.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section id="vision" className="relative py-24 px-6 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-navy/15 to-black" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gold/3 blur-3xl" />

      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="text-center mb-6">
          <span className="font-cormorant text-gold/60 text-sm tracking-widest uppercase">
            {t.vision.eyebrow}
          </span>
        </div>
        <h2 className="font-cinzel text-4xl md:text-5xl font-bold text-white text-center mb-4">
          {t.vision.title}
        </h2>
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="h-px w-20 bg-gradient-to-r from-transparent to-gold/50" />
          <div className="w-2 h-2 rounded-full bg-gold" />
          <div className="h-px w-20 bg-gradient-to-l from-transparent to-gold/50" />
        </div>

        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="font-cormorant text-xl md:text-2xl text-white/70 italic leading-relaxed">
            "{t.vision.tagline}{' '}
            <span className="text-gold font-bold not-italic">{t.vision.taglineHighlight}</span>{' '}
            {t.vision.taglineSuffix}"
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {t.vision.pillars.map((pillar, i) => {
            const Icon = pillarIcons[i];
            return (
              <div
                key={pillar.title}
                ref={(el) => { cardsRef.current[i] = el; }}
                className="vision-card border border-gold/20 rounded-2xl p-7 backdrop-blur-sm bg-black/40 hover:border-gold/50 hover:bg-gold/5 transition-all duration-500 group"
                style={{
                  transition: `opacity 0.7s ease ${i * 0.12}s, transform 0.7s ease ${i * 0.12}s, border-color 0.3s, background-color 0.3s`,
                }}
              >
                <div className="flex items-start gap-5">
                  <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center flex-shrink-0 group-hover:bg-gold/20 transition-colors">
                    <Icon className="w-5 h-5 text-gold" />
                  </div>
                  <div>
                    <h3 className="font-cinzel text-gold text-lg font-bold mb-2">{pillar.title}</h3>
                    <p className="font-cormorant text-white/65 leading-relaxed">{pillar.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div
          ref={sectionRef}
          className="relative border border-gold/30 rounded-2xl p-8 md:p-12 backdrop-blur-sm bg-gradient-to-br from-navy/20 via-black/60 to-black/60 text-center overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-gold/5 to-transparent" />
          <div className="relative z-10">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full border-2 border-gold/50 flex items-center justify-center bg-black/50">
                <Zap className="w-7 h-7 text-gold" />
              </div>
            </div>
            <p className="font-cormorant text-gold/60 text-sm tracking-widest uppercase mb-3">
              {t.vision.identityEyebrow}
            </p>
            <h3 className="font-cinzel text-3xl md:text-4xl font-bold text-white mb-4">
              {t.vision.identityTitle}
            </h3>
            <p className="font-cormorant text-white/65 text-lg leading-relaxed max-w-xl mx-auto italic">
              {t.vision.identityDescription}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
