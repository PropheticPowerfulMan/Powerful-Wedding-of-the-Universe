import { useEffect, useRef } from 'react';
import { Heart, Star, Gem, Sparkles, type LucideIcon } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const milestoneIcons: LucideIcon[] = [Star, Heart, Sparkles, Gem, Star];

type MilestoneItem = { year: string; title: string; description: string };

function TimelineItem({
  item,
  index,
  icon: Icon,
}: {
  item: MilestoneItem;
  index: number;
  icon: LucideIcon;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isLeft = index % 2 === 0;

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
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: 0,
        transform: 'translateY(40px)',
        transition: `opacity 0.8s ease ${index * 0.15}s, transform 0.8s ease ${index * 0.15}s`,
      }}
      className={`relative flex flex-col md:flex-row items-center gap-6 md:gap-0 ${
        isLeft ? 'md:flex-row' : 'md:flex-row-reverse'
      }`}
    >
      <div className={`flex-1 md:px-10 ${isLeft ? 'md:text-right' : 'md:text-left'}`}>
        <div
          className={`inline-block border border-gold/30 rounded-xl p-5 backdrop-blur-sm bg-black/40 hover:border-gold/60 hover:bg-gold/5 transition-all duration-400 max-w-sm ${
            isLeft ? 'md:ml-auto' : ''
          }`}
        >
          <span className="font-cinzel text-gold text-xs tracking-widest">{item.year}</span>
          <h3 className="font-cinzel text-white text-lg font-bold mt-1 mb-2">{item.title}</h3>
          <p className="font-cormorant text-white/65 text-base leading-relaxed">{item.description}</p>
        </div>
      </div>

      <div className="relative flex items-center justify-center z-10 flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-black border-2 border-gold/60 flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.3)]">
          <Icon className="w-5 h-5 text-gold" />
        </div>
      </div>

      <div className="flex-1 md:px-10 hidden md:block" />
    </div>
  );
}

export default function OurStory() {
  const { t } = useLanguage();

  return (
    <section id="story" className="relative py-24 px-6 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-navy/10 to-black" />

      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <span className="font-cormorant text-gold/60 text-sm tracking-widest uppercase">
            {t.ourStory.eyebrow}
          </span>
          <h2 className="font-cinzel text-4xl md:text-5xl font-bold text-white mt-2 mb-4">
            {t.ourStory.title}
          </h2>
          <div className="flex items-center justify-center gap-4">
            <div className="h-px w-20 bg-gradient-to-r from-transparent to-gold/50" />
            <div className="w-2 h-2 rounded-full bg-gold" />
            <div className="h-px w-20 bg-gradient-to-l from-transparent to-gold/50" />
          </div>
        </div>

        <div className="relative">
          <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-gold/30 to-transparent hidden md:block" />

          <div className="flex flex-col gap-12">
            {t.ourStory.milestones.map((item, i) => (
              <TimelineItem key={item.year + item.title} item={item} index={i} icon={milestoneIcons[i]} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
