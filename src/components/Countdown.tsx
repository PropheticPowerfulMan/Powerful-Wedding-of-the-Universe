import { useCountdown } from '../hooks/useCountdown';
import { useLanguage } from '../contexts/LanguageContext';

export default function Countdown() {
  const { days, hours, minutes, seconds } = useCountdown();
  const { t } = useLanguage();

  const units = [
    { value: days, label: t.countdown.days },
    { value: hours, label: t.countdown.hours },
    { value: minutes, label: t.countdown.minutes },
    { value: seconds, label: t.countdown.seconds },
  ];

  return (
    <div className="flex flex-wrap justify-center gap-4 md:gap-8">
      {units.map(({ value, label }, idx) => (
        <div key={label} className="flex items-center gap-4 md:gap-8">
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="w-20 h-20 md:w-28 md:h-28 rounded-xl bg-black/60 border border-gold/40 backdrop-blur-sm flex items-center justify-center shadow-[0_0_30px_rgba(212,175,55,0.15)]">
                <span className="font-cinzel text-3xl md:text-5xl font-bold text-gold">
                  {String(value).padStart(2, '0')}
                </span>
              </div>
              <div className="absolute inset-0 rounded-xl border border-gold/20 animate-pulse" />
            </div>
            <span className="font-cormorant text-white/50 text-xs md:text-sm tracking-widest uppercase mt-2">
              {label}
            </span>
          </div>
          {idx < 3 && (
            <span className="font-cinzel text-gold text-2xl md:text-4xl font-bold mb-6 opacity-60">
              :
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
