import { useEffect, useRef } from 'react';
import { MapPin, Sun, Moon, Sparkles, FileCheck } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const eventStyles = [
  {
    icon: FileCheck,
    color: 'from-blue-900/40 to-black/60',
    borderColor: 'border-blue-500/30',
    iconColor: 'text-blue-400',
    badgeColor: 'bg-blue-900/40 text-blue-300',
  },
  {
    icon: Sun,
    color: 'from-amber-900/30 to-black/60',
    borderColor: 'border-amber-500/30',
    iconColor: 'text-amber-400',
    badgeColor: 'bg-amber-900/40 text-amber-300',
  },
  {
    icon: Sparkles,
    color: 'from-gold/10 to-black/60',
    borderColor: 'border-gold/30',
    iconColor: 'text-gold',
    badgeColor: 'bg-gold/10 text-gold',
  },
  {
    icon: Moon,
    color: 'from-navy/40 to-black/60',
    borderColor: 'border-navy/50',
    iconColor: 'text-blue-300',
    badgeColor: 'bg-navy/40 text-blue-200',
  },
];

export default function EventProgram() {
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const { t } = useLanguage();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.15 }
    );
    cardsRef.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section id="events" className="relative py-24 px-6 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black to-navy/10" />

      <div className="relative z-10 max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <span className="font-cormorant text-gold/60 text-sm tracking-widest uppercase">
            {t.events.eyebrow}
          </span>
          <h2 className="font-cinzel text-4xl md:text-5xl font-bold text-white mt-2 mb-4">
            {t.events.title}
          </h2>
          <div className="flex items-center justify-center gap-4">
            <div className="h-px w-20 bg-gradient-to-r from-transparent to-gold/50" />
            <div className="w-2 h-2 rounded-full bg-gold" />
            <div className="h-px w-20 bg-gradient-to-l from-transparent to-gold/50" />
          </div>
        </div>

        <div className="space-y-5">
          {t.events.items.map((event, i) => {
            const style = eventStyles[i];
            const Icon = style.icon;
            return (
              <div
                key={event.label}
                ref={(el) => { cardsRef.current[i] = el; }}
                style={{
                  transition: `opacity 0.7s ease ${i * 0.1}s, transform 0.7s ease ${i * 0.1}s`,
                }}
                className={`relative border ${style.borderColor} rounded-2xl p-6 backdrop-blur-sm bg-gradient-to-r ${style.color} hover:scale-[1.01] transition-transform duration-300 overflow-hidden group`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-gold/0 to-gold/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl border ${style.borderColor} bg-black/40 flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${style.iconColor}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-cinzel text-white font-bold text-base">{event.label}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-cormorant tracking-wider ${style.badgeColor}`}>
                        {event.time}
                      </span>
                    </div>
                    <p className="font-cinzel text-white/70 text-sm mb-2">{event.date}</p>
                    <p className="font-cormorant text-white/55 text-base leading-relaxed mb-2">
                      {event.description}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gold/50" />
                      <span className="font-cormorant text-white/45 text-sm">
                        {event.location} · {event.city}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
