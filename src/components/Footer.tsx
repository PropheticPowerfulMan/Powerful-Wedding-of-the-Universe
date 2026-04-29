import { Crown, Heart } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="relative py-12 px-6 border-t border-gold/10 overflow-hidden">
      <div className="absolute inset-0 bg-black" />
      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <div className="flex justify-center mb-4">
          <Crown className="w-6 h-6 text-gold/50" />
        </div>
        <p className="font-cinzel text-gold/60 text-sm tracking-widest mb-2">
          Jonathan & Maria · 2026
        </p>
        <p className="font-cormorant text-white/30 text-sm italic">
          {t.footer.tagline}
        </p>
        <div className="flex items-center justify-center gap-2 mt-4 text-white/20">
          <span className="font-cormorant text-xs">{t.footer.madeWith}</span>
          <Heart className="w-3 h-3 text-gold/40 fill-gold/20" />
          <span className="font-cormorant text-xs">{t.footer.madeIn}</span>
        </div>
        <p className="font-cormorant text-white/15 text-xs mt-2">
          {t.footer.verse}
        </p>
      </div>
    </footer>
  );
}
