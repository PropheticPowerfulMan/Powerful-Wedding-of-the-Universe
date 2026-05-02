import { useState, useEffect, useRef } from 'react';
import { Menu, X, Crown } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { scrollToSection } from '../utils/scrollToSection';

const navHrefs = ['#story', '#vision', '#events', '#gallery', '#rsvp', '#invitation', '#admin'] as const;

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const { lang, setLang, t } = useLanguage();

  const navLabels = [
    t.nav.ourStory,
    t.nav.vision,
    t.nav.events,
    t.nav.gallery,
    t.nav.rsvp,
    t.nav.invitation,
    t.nav.administration,
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (navRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [open]);

  const handleNav = (href: string) => {
    setOpen(false);
    window.requestAnimationFrame(() => scrollToSection(href));
  };

  const toggleLang = () => setLang(lang === 'en' ? 'fr' : 'en');

  return (
    <nav
      ref={navRef}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? 'bg-black/90 backdrop-blur-xl border-b border-gold/20 py-3' : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <button
          onClick={() => handleNav('#hero')}
          className="flex items-center gap-2 group"
        >
          <Crown className="w-5 h-5 text-gold group-hover:scale-110 transition-transform" />
          <span className="font-cinzel text-gold text-sm tracking-widest font-bold">J & M</span>
        </button>

        <ul className="hidden md:flex items-center gap-8">
          {navHrefs.map((href, i) => (
            <li key={href}>
              <button
                onClick={() => handleNav(href)}
                className="font-cormorant text-white/80 hover:text-gold text-sm tracking-wider transition-colors duration-300 uppercase"
              >
                {navLabels[i]}
              </button>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleLang}
            aria-label="Switch language"
            className="hidden md:flex items-center gap-1 border border-gold/40 rounded-full px-3 py-1 font-cinzel text-gold text-xs tracking-widest hover:bg-gold/10 hover:border-gold/70 transition-all duration-200"
          >
            <span className="w-4 h-4 text-center leading-4">{lang === 'en' ? '🇫🇷' : '🇬🇧'}</span>
            <span>{t.nav.langSwitch}</span>
          </button>
          <button
            className="md:hidden text-gold"
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden bg-black/95 backdrop-blur-xl border-t border-gold/20">
          <ul className="flex flex-col py-4">
            {navHrefs.map((href, i) => (
              <li key={href}>
                <button
                  onClick={() => handleNav(href)}
                  className="w-full text-left px-6 py-3 font-cormorant text-white/80 hover:text-gold hover:bg-gold/5 text-base tracking-wider transition-colors duration-200 uppercase"
                >
                  {navLabels[i]}
                </button>
              </li>
            ))}
            <li>
              <button
                onClick={toggleLang}
                className="w-full text-left px-6 py-3 font-cinzel text-gold/70 hover:text-gold hover:bg-gold/5 text-sm tracking-widest transition-colors duration-200 flex items-center gap-2"
              >
                <span>{lang === 'en' ? '🇫🇷' : '🇬🇧'}</span>
                <span>{t.nav.langSwitch}</span>
              </button>
            </li>
          </ul>
        </div>
      )}
    </nav>
  );
}
