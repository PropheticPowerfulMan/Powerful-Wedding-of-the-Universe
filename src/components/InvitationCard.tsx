import { useEffect, useRef, useState } from 'react';
import { Download, X, Crown, Star } from 'lucide-react';
import html2canvas from 'html2canvas';
import { supabase } from '../lib/supabase';
import type { Guest } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  guest: Guest;
  onClose: () => void;
}

export default function InvitationCard({ guest, onClose }: Props) {
  const { t } = useLanguage();
  const inv = t.invitation;
  const cardRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [confetti, setConfetti] = useState<{ x: number; y: number; color: string; size: number; angle: number }[]>([]);

  const guestName = [guest.first_name, guest.post_name, guest.last_name].filter(Boolean).join(' ');
  const invitationRecipient = guest.is_couple ? `Mr. ${guestName} and spouse` : guestName;

  useEffect(() => {
    setTimeout(() => setVisible(true), 50);
    const particles = Array.from({ length: 40 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 40,
      color: ['#D4AF37', '#F0C040', '#FFFFFF', '#1A3A8A', '#C5A028'][Math.floor(Math.random() * 5)],
      size: Math.random() * 6 + 3,
      angle: Math.random() * 360,
    }));
    setConfetti(particles);
  }, []);

const handlePrint = async () => {
  const invitationCard = cardRef.current?.querySelector('#invitation-card') as HTMLElement;
  if (!invitationCard) return;

  try {
    const canvas = await html2canvas(invitationCard, {
      backgroundColor: '#060E1C',
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const link = document.createElement('a');
    link.download = `invitation-${guestName.replace(/\s+/g, '-')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

    // Notifier l'hôte + l'invité (si contacts disponibles) après téléchargement
    supabase.functions.invoke('notify-download', {
      body: {
        guest_id: guest.id,
        guest_name: guestName,
        is_couple: guest.is_couple,
        person_type: guest.person_type ?? 'family',
        gender: guest.gender ?? 'male',
        contact_email: guest.rsvp_contact_email || undefined,
        contact_phone: guest.rsvp_contact_phone || (guest.phone || undefined),
        partner_contact_phone: guest.partner_phone || undefined,
      },
    }).catch(() => { /* notification silencieuse, ne bloque pas le téléchargement */ });

  } catch (err) {
    console.error('Download failed', err);
  }
};




  return (
    <div
      id="invitation-modal"
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-700 ${
        visible ? 'bg-black/80 backdrop-blur-sm' : 'bg-transparent'
      }`}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden print:hidden">
        {confetti.map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-confetti"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              transform: `rotate(${p.angle}deg)`,
              animation: `confetti-fall ${2 + Math.random() * 3}s ease-in forwards ${Math.random() * 0.5}s`,
            }}
          />
        ))}
      </div>

      <div
        ref={cardRef}
        className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto transition-all duration-700 print:max-h-none print:overflow-visible ${
          visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-8'
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={inv.closeLabel}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/60 border border-gold/30 pointer-events-auto flex items-center justify-center text-white/60 hover:text-gold hover:border-gold/60 transition-all print:hidden"
        >
          <X className="w-4 h-4" />
        </button>

        <div
          id="invitation-card"
          className="relative border-2 border-gold/60 rounded-2xl overflow-hidden bg-gradient-to-b from-[#0B1120] via-[#060E1C] to-[#0B1120]"
          style={{
            boxShadow: '0 0 60px rgba(212,175,55,0.15), 0 0 120px rgba(212,175,55,0.05)',
          }}
        >
          <div className="absolute inset-0 opacity-5">
            <div
              style={{
                backgroundImage:
                  'repeating-linear-gradient(45deg, #D4AF37 0, #D4AF37 1px, transparent 0, transparent 50%)',
                backgroundSize: '20px 20px',
              }}
              className="w-full h-full"
            />
          </div>

          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gold to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gold to-transparent" />
          <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-gold to-transparent" />
          <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-gold to-transparent" />

          <div className="relative z-10 p-8 md:p-12 text-center print:p-12">
            <div className="flex justify-center mb-5">
              <div className="w-14 h-14 rounded-full border-2 border-gold/60 bg-gold/10 flex items-center justify-center">
                <Crown className="w-6 h-6 text-gold" />
              </div>
            </div>

            <div className="flex justify-center gap-2 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3 h-3 text-gold/50" style={{ fill: 'rgba(212, 175, 55, 0.3)' }} />
              ))}
            </div>

            <p className="font-cormorant text-gold/60 text-xs tracking-[0.4em] uppercase mb-2">
              {inv.cardCelebration}
            </p>

            <p className="font-cormorant text-white/70 text-base md:text-lg leading-relaxed mb-4">
              {inv.cardInvited}{' '}
              <span className="text-gold font-bold text-lg md:text-xl">{inv.cardInvitedHighlight}</span>{' '}
              {inv.cardInvitedSuffix}
            </p>

            <h2 className="font-cinzel text-2xl md:text-4xl font-bold text-white mb-1">
              Jonathan Lokala, Lomboto
            </h2>
            <p className="font-cormorant text-gold text-xl mb-1">&</p>
            <h2 className="font-cinzel text-2xl md:text-4xl font-bold text-white mb-6">Maria Nzitusu, Mvibudulu</h2>

            <div className="h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent mb-6" />

            <div className="text-left max-w-md mx-auto mb-8">
              <p className="font-cormorant text-white/75 text-base md:text-lg leading-relaxed">
                {inv.cardDear}{' '}
                <span className="text-gold font-semibold">{invitationRecipient}</span>,
              </p>
              {guest.is_couple && (
                <p className="font-cormorant text-gold/70 text-sm md:text-base leading-relaxed mt-2">
                  {inv.cardCouple}
                </p>
              )}
              <p className="font-cormorant text-white/65 text-base md:text-lg leading-relaxed mt-2">
                {inv.cardHonor}
              </p>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent mb-6" />

            <p className="font-cormorant text-gold/60 text-xs tracking-[0.3em] uppercase mb-4">
              {inv.cardSchedule}
            </p>
            <div className="space-y-3 max-w-md mx-auto mb-8 text-left">
              {inv.cardScheduleItems.map((item) => (
                <div
                  key={item.event}
                  className="flex items-start gap-3 border border-gold/15 rounded-lg p-3 bg-white/3"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-gold mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="font-cinzel text-white text-xs font-semibold">{item.event}</p>
                    <p className="font-cormorant text-white/55 text-sm">{item.date} · {item.time}</p>
                    <p className="font-cormorant text-white/40 text-xs">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent mb-6" />

            <blockquote className="max-w-xs mx-auto mb-8">
              <p className="font-cormorant text-white/55 text-sm italic leading-relaxed">
                "{inv.cardVerse}"
              </p>
              <cite className="font-cormorant text-gold/50 text-xs tracking-widest not-italic">
                {inv.cardVerseRef}
              </cite>
            </blockquote>

            <div className="flex justify-center gap-2 mb-5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3 h-3 text-gold/50" style={{ fill: 'rgba(212, 175, 55, 0.3)' }} />
              ))}
            </div>

            <div className="border-t border-gold/20 pt-5">
              <p className="font-cinzel text-gold text-sm font-bold">Jonathan Lokala, Lomboto</p>
              <p className="font-cormorant text-white/45 text-xs tracking-widest italic mt-0.5">
                {inv.cardSubtitle}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-center mt-6 print:hidden">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-gold/80 to-gold hover:from-gold hover:to-amber-400 text-black font-cinzel text-sm font-bold tracking-widest uppercase rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(212,175,55,0.3)]"
          >
            <Download className="w-4 h-4" />
            {inv.download}
          </button>
        </div>
      </div>
    </div>
  );
}
