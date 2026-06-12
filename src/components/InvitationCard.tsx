import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle, Crown, Download, Loader2, Star, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Guest } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  guest: Guest;
  onClose: () => void;
}

export default function InvitationCard({ guest, onClose }: Props) {
  const { lang, t } = useLanguage();
  const inv = t.invitation;
  const cardRef = useRef<HTMLDivElement>(null);
  const invitationBlobRef = useRef<Blob | null>(null);
  const [visible, setVisible] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadDialog, setDownloadDialog] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confetti, setConfetti] = useState<{ x: number; y: number; color: string; size: number; angle: number }[]>([]);

  const guestName = [guest.first_name, guest.post_name, guest.last_name].filter(Boolean).join(' ');
  const invitationRecipient = guest.is_couple ? `Mr. ${guestName} and spouse` : guestName;
  const ceremonyLabels = {
    celebration: lang === 'fr' ? 'Mariage religieux et b\u00e9n\u00e9diction nuptiale' : 'Religious wedding and nuptial blessing',
    schedule: lang === 'fr' ? 'Programme de l\'invitation' : 'Invitation program',
    downloading: lang === 'fr' ? 'Pr\u00e9paration...' : 'Preparing...',
    success: lang === 'fr'
      ? 'Votre invitation est pr\u00eate et a \u00e9t\u00e9 t\u00e9l\u00e9charg\u00e9e.'
      : 'Your invitation is ready and has been downloaded.',
    error: lang === 'fr'
      ? "Le t\u00e9l\u00e9chargement n'a pas pu aboutir. Veuillez r\u00e9essayer."
      : 'The download could not be completed. Please try again.',
  };
  const ceremonyItems = lang === 'fr'
    ? [
        {
          event: 'Mariage religieux et b\u00e9n\u00e9diction nuptiale',
          date: '26 juin 2026',
          detail: 'LES MESSAGERS CHURCH',
          time: '16h00',
        },
        {
          event: 'R\u00e9ception et c\u00e9l\u00e9bration',
          date: '26 juin 2026',
          detail: 'Av. Congo ya sika n*3, Q/Pigeon C/Ngaliema',
          time: '20h00',
        },
      ]
    : [
        {
          event: 'Religious wedding and nuptial blessing',
          date: 'June 26, 2026',
          detail: 'LES MESSAGERS CHURCH',
          time: '4:00 PM',
        },
        {
          event: 'Reception and celebration',
          date: 'June 26, 2026',
          detail: 'Av. Congo ya sika n*3, Q/Pigeon C/Ngaliema',
          time: '8:00 PM',
        },
      ];

  const isMobileOrTablet = () => (
    window.matchMedia('(max-width: 1024px)').matches ||
    /Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent)
  );

  const safeFileName = `invitation-${guestName.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'guest'}.png`;

  const triggerImageDownload = async (blob: Blob, filename: string) => {
    const file = new File([blob], filename, { type: 'image/png' });

    if (isMobileOrTablet() && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: filename,
        });
        return;
      } catch {
        // Fall back to a normal browser download if native sharing is cancelled or blocked.
      }
    }

    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    link.rel = 'noopener';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    window.setTimeout(() => {
      link.remove();
      URL.revokeObjectURL(objectUrl);
    }, 60000);
  };

  const createInvitationBlob = async () => {
    if (invitationBlobRef.current) return invitationBlobRef.current;

    await document.fonts?.ready;
    const invitationCard = cardRef.current?.querySelector('#invitation-card') as HTMLElement | null;
    if (!invitationCard) throw new Error('Invitation card is not available');

    const { default: html2canvas } = await import('html2canvas');
    const exportWidth = 1080;
    const exportScale = 4;

    const canvas = await html2canvas(invitationCard, {
      backgroundColor: '#060E1C',
      scale: exportScale,
      useCORS: true,
      allowTaint: true,
      logging: false,
      windowWidth: Math.max(document.documentElement.clientWidth, invitationCard.scrollWidth),
      windowHeight: Math.max(document.documentElement.clientHeight, invitationCard.scrollHeight),
      onclone: (documentClone) => {
        const clonedCard = documentClone.querySelector('#invitation-card') as HTMLElement | null;
        if (!clonedCard) return;

        clonedCard.style.width = `${exportWidth}px`;
        clonedCard.style.maxWidth = `${exportWidth}px`;
        clonedCard.style.transform = 'none';
        clonedCard.style.margin = '0';
        clonedCard.style.boxShadow = '0 0 90px rgba(212, 175, 55, 0.28)';
      },
    });

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => {
        if (value) resolve(value);
        else reject(new Error('Unable to create invitation image'));
      }, 'image/png', 1);
    });

    invitationBlobRef.current = blob;
    return blob;
  };

  useEffect(() => {
    setTimeout(() => setVisible(true), 50);
    const particleCount = window.matchMedia('(max-width: 640px)').matches ? 12 : 40;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 40,
      color: ['#D4AF37', '#F0C040', '#FFFFFF', '#1A3A8A', '#C5A028'][Math.floor(Math.random() * 5)],
      size: Math.random() * 6 + 3,
      angle: Math.random() * 360,
    }));
    setConfetti(particles);
  }, []);

  const handlePrint = async () => {
    if (isDownloading) return;

    setIsDownloading(true);
    setDownloadDialog(null);

    try {
      const blob = await createInvitationBlob();
      await triggerImageDownload(blob, safeFileName);
      setDownloadDialog({ type: 'success', message: ceremonyLabels.success });

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
      }).catch(() => { /* Notification silencieuse, sans bloquer le téléchargement. */ });
    } catch (err) {
      console.error('Download failed', err);
      setDownloadDialog({ type: 'error', message: ceremonyLabels.error });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      id="invitation-modal"
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 transition-all duration-700 ${
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
        className={`relative z-10 w-full max-w-2xl max-h-[92dvh] overflow-y-auto transition-all duration-700 print:max-h-none print:overflow-visible ${
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
              {ceremonyLabels.celebration}
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
              {ceremonyLabels.schedule}
            </p>
            <div className="space-y-3 max-w-md mx-auto mb-8 text-left">
              {ceremonyItems.map((item) => (
                <div
                  key={item.event}
                  className="flex items-start gap-3 border border-gold/15 rounded-lg p-3 bg-white/3"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-gold mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="font-cinzel text-white text-xs font-semibold">{item.event}</p>
                    <p className="font-cormorant text-white/55 text-sm">{item.date} - {item.time}</p>
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
            disabled={isDownloading}
            aria-busy={isDownloading}
            className="flex min-h-12 items-center justify-center gap-2 px-8 py-3.5 bg-gradient-to-r from-gold/80 to-gold hover:from-gold hover:to-amber-400 text-black font-cinzel text-sm font-bold tracking-widest uppercase rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(212,175,55,0.3)] disabled:cursor-wait disabled:opacity-80"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {ceremonyLabels.downloading}
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                {inv.download}
              </>
            )}
          </button>
        </div>
      </div>

      {downloadDialog && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4 print:hidden"
        >
          <div className="w-full max-w-sm rounded-xl border border-gold/30 bg-[#07101f] p-6 text-center shadow-[0_0_50px_rgba(0,0,0,0.55)]">
            <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${
              downloadDialog.type === 'success' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'
            }`}>
              {downloadDialog.type === 'success' ? (
                <CheckCircle className="h-7 w-7" />
              ) : (
                <AlertCircle className="h-7 w-7" />
              )}
            </div>
            <p className={`font-cormorant text-lg font-semibold leading-relaxed ${
              downloadDialog.type === 'success' ? 'text-emerald-300' : 'text-red-200'
            }`}>
              {downloadDialog.message}
            </p>
            <button
              type="button"
              onClick={() => setDownloadDialog(null)}
              className="mt-5 min-h-11 rounded-lg bg-gold px-6 font-cinzel text-xs font-bold uppercase tracking-widest text-black transition-colors hover:bg-amber-300"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
