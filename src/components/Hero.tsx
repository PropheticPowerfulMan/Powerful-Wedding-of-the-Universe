import { useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import Countdown from './Countdown';
import { useLanguage } from '../contexts/LanguageContext';
import { scrollToSection } from '../utils/scrollToSection';

export default function Hero() {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const { t } = useLanguage();
  const { dates } = t.hero;

  useEffect(() => {
    const tl = [titleRef.current, subtitleRef.current];
    tl.forEach((el, i) => {
      if (!el) return;
      el.style.opacity = '0';
      el.style.transform = 'translateY(40px)';
      setTimeout(() => {
        el.style.transition = 'opacity 1.2s ease, transform 1.2s ease';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, 300 + i * 400);
    });
  }, []);

  const scrollDown = () => {
    scrollToSection('#story');
  };

  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-navy/80 via-black to-black" />

      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-gold/5 blur-3xl animate-pulse" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] rounded-full bg-navy/30 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[250px] h-[250px] rounded-full bg-gold/8 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="mb-6 animate-fade-in">
          <div className="inline-flex items-center gap-3 border border-gold/30 rounded-full px-5 py-2 backdrop-blur-sm bg-black/30">
            <div className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
            <span className="font-cormorant text-gold/80 text-sm tracking-widest uppercase">
              {t.hero.badge}
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
          </div>
        </div>

        <div className="mb-3">
          <span className="font-cormorant text-gold/60 text-lg md:text-xl tracking-[0.3em] uppercase">
            {t.hero.theWeddingOf}
          </span>
        </div>

        <h1
          ref={titleRef}
          className="font-cinzel text-4xl md:text-6xl lg:text-8xl font-bold text-white leading-tight mb-4"
        >
          Jonathan{' '}
          <span className="text-gold drop-shadow-[0_0_30px_rgba(212,175,55,0.5)]">&</span>{' '}
          Maria
        </h1>

        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-gold/60" />
          <span className="w-2 h-2 rounded-full bg-gold" />
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-gold/60" />
        </div>

        <p
          ref={subtitleRef}
          className="font-cormorant text-xl md:text-3xl text-white/70 italic mb-10 tracking-wide"
        >
          {t.hero.subtitle}
        </p>

        <div className="mb-14">
          <Countdown />
        </div>

        <div className="mb-12">
          <p className="font-cormorant text-white/50 text-sm tracking-widest uppercase mb-6">
            {t.hero.importantDates}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-4xl mx-auto">
            {dates.map(({ event, date, detail }) => (
              <div
                key={event}
                className="border border-gold/20 rounded-lg p-4 backdrop-blur-sm bg-black/30 hover:border-gold/50 hover:bg-gold/5 transition-all duration-300 group"
              >
                <p className="font-cormorant text-gold/70 text-xs tracking-widest uppercase mb-1 group-hover:text-gold transition-colors">
                  {event}
                </p>
                <p className="font-cinzel text-white text-sm font-semibold mb-1">{date}</p>
                <p className="font-cormorant text-white/50 text-xs">{detail}</p>
              </div>
            ))}
          </div>
        </div>

        <blockquote className="max-w-2xl mx-auto border-l-2 border-gold/40 pl-5 mb-10 text-left">
          <p className="font-cormorant text-white/70 text-lg italic leading-relaxed">
            {t.hero.verse}
          </p>
          <cite className="font-cormorant text-gold/60 text-sm tracking-widest not-italic">
            {t.hero.verseRef}
          </cite>
        </blockquote>

        <button
          onClick={scrollDown}
          className="flex flex-col items-center gap-2 mx-auto text-white/30 hover:text-gold transition-colors duration-300 group"
        >
          <span className="font-cormorant text-xs tracking-widest uppercase">{t.ourStory.title}</span>
          <ChevronDown className="w-5 h-5 animate-bounce group-hover:text-gold" />
        </button>
      </div>
    </section>
  );
}
