import { useState } from 'react';
import { CheckCircle, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

type RSVPForm = {
  first_name: string;
  post_name: string;
  last_name: string;
  contact_email: string;
  contact_phone: string;
  rsvp_status: 'attending' | 'not_attending' | 'maybe';
  rsvp_message: string;
  number_of_guests: number;
};

export default function RSVP() {
  const [form, setForm] = useState<RSVPForm>({
    first_name: '',
    post_name: '',
    last_name: '',
    contact_email: '',
    contact_phone: '',
    rsvp_status: 'attending',
    rsvp_message: '',
    number_of_guests: 1,
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'not_found' | 'error'>('idle');
  const { t } = useLanguage();
  const r = t.rsvp;

  const minGuests = form.rsvp_status === 'not_attending' ? 0 : 1;
  const guestCountOptions = form.rsvp_status === 'not_attending' ? [0] : [1, 2, 3, 4];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    let query = supabase
      .from('guests')
      .select('*')
      .ilike('first_name', form.first_name.trim())
      .ilike('last_name', form.last_name.trim());

    if (form.post_name.trim()) {
      query = query.ilike('post_name', form.post_name.trim());
    }

    const { data: guests } = await query;

    if (!guests || guests.length === 0) {
      setStatus('not_found');
      return;
    }

    const guest = guests[0];
    const numericGuests = Number.isFinite(form.number_of_guests)
      ? Math.trunc(form.number_of_guests)
      : minGuests;
    const parsedGuests =
      form.rsvp_status === 'not_attending'
        ? 0
        : Math.min(Math.max(numericGuests, 1), 10);
    const { error } = await supabase
      .from('guests')
      .update({
        rsvp_status: form.rsvp_status,
        rsvp_message: form.rsvp_message,
        number_of_guests: parsedGuests,
        rsvp_contact_email: form.contact_email.trim(),
        rsvp_contact_phone: form.contact_phone.trim(),
        invitation_status: 'confirmed',
      })
      .eq('id', guest.id);

    if (error) {
      setStatus('error');
    } else {
      const guestName = [guest.first_name, guest.post_name, guest.last_name].filter(Boolean).join(' ');
      const notifyEmail = form.contact_email.trim() || guest.rsvp_contact_email || '';
      const notifyPhone = form.contact_phone.trim() || guest.rsvp_contact_phone || guest.phone || '';
      const { error: notifyError } = await supabase.functions.invoke('notify-rsvp', {
        body: {
          guest_name: guestName,
          is_couple: !!guest.is_couple,
          gender: guest.gender,
          person_type: guest.person_type,
          guest_phone: guest.phone,
          guest_email: guest.rsvp_contact_email,
          rsvp_status: form.rsvp_status,
          number_of_guests: parsedGuests,
          rsvp_message: form.rsvp_message,
          contact_email: notifyEmail,
          contact_phone: notifyPhone,
        },
      });

      if (notifyError) {
        console.error('RSVP notification error:', notifyError);
      }

      setStatus('success');
    }
  };

  if (status === 'success') {
    return (
      <section id="rsvp" className="relative py-24 px-6">
        <div className="max-w-xl mx-auto text-center">
          <div className="w-20 h-20 rounded-full bg-gold/10 border-2 border-gold/50 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-gold" />
          </div>
          <h3 className="font-cinzel text-3xl font-bold text-white mb-4">{r.successTitle}</h3>
          <p className="font-cormorant text-white/65 text-lg leading-relaxed">
            {r.successMessage}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="rsvp" className="relative py-24 px-6 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-navy/10 to-black" />

      <div className="relative z-10 max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <span className="font-cormorant text-gold/60 text-sm tracking-widest uppercase">
            {r.eyebrow}
          </span>
          <h2 className="font-cinzel text-4xl md:text-5xl font-bold text-white mt-2 mb-4">
            {r.title}
          </h2>
          <div className="flex items-center justify-center gap-4">
            <div className="h-px w-20 bg-gradient-to-r from-transparent to-gold/50" />
            <div className="w-2 h-2 rounded-full bg-gold" />
            <div className="h-px w-20 bg-gradient-to-l from-transparent to-gold/50" />
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="border border-gold/20 rounded-2xl p-8 backdrop-blur-sm bg-black/40 space-y-5"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="block font-cormorant text-white/60 text-sm tracking-widest uppercase mb-2">
                {r.firstName} *
              </label>
              <input
                type="text"
                required
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                className="w-full bg-black/50 border border-gold/20 rounded-lg px-4 py-3 font-cormorant text-white text-base focus:outline-none focus:border-gold/50 transition-colors"
                placeholder={r.firstName}
              />
            </div>
            <div>
              <label className="block font-cormorant text-white/60 text-sm tracking-widest uppercase mb-2">
                {r.postName}
              </label>
              <input
                type="text"
                value={form.post_name}
                onChange={(e) => setForm({ ...form, post_name: e.target.value })}
                className="w-full bg-black/50 border border-gold/20 rounded-lg px-4 py-3 font-cormorant text-white text-base focus:outline-none focus:border-gold/50 transition-colors"
                placeholder={r.postName}
              />
            </div>
            <div>
              <label className="block font-cormorant text-white/60 text-sm tracking-widest uppercase mb-2">
                {r.lastName} *
              </label>
              <input
                type="text"
                required
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                className="w-full bg-black/50 border border-gold/20 rounded-lg px-4 py-3 font-cormorant text-white text-base focus:outline-none focus:border-gold/50 transition-colors"
                placeholder={r.lastName}
              />
            </div>
          </div>

          <div>
            <label className="block font-cormorant text-white/60 text-sm tracking-widest uppercase mb-2">
              {r.willYouAttend} *
            </label>
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              {(['attending', 'not_attending', 'maybe'] as const).map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setForm({ ...form, rsvp_status: val })}
                  className={`py-2 md:py-3 px-2 md:px-3 rounded-lg border font-cormorant text-xs md:text-sm tracking-wider uppercase transition-all duration-200 break-words ${
                    form.rsvp_status === val
                      ? 'border-gold bg-gold/10 text-gold'
                      : 'border-gold/20 text-white/50 hover:border-gold/40 hover:text-white/70'
                  }`}
                >
                  {val === 'attending' ? r.attending : val === 'not_attending' ? r.notAttending : r.maybe}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-cormorant text-white/60 text-sm tracking-widest uppercase mb-2">
              {r.guestsLabel}
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {guestCountOptions.map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setForm({ ...form, number_of_guests: count })}
                  className={`px-3 py-1.5 rounded-md border font-cormorant text-sm transition-colors ${
                    form.number_of_guests === count
                      ? 'border-gold bg-gold/10 text-gold'
                      : 'border-gold/20 text-white/60 hover:border-gold/40 hover:text-white/80'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
            <input
              type="number"
              min={minGuests}
              max="10"
              value={form.number_of_guests}
              onChange={(e) => {
                const nextValue = parseInt(e.target.value, 10);
                setForm({
                  ...form,
                  number_of_guests: Number.isNaN(nextValue) ? minGuests : nextValue,
                });
              }}
              className="w-full bg-black/50 border border-gold/20 rounded-lg px-4 py-3 font-cormorant text-white text-base focus:outline-none focus:border-gold/50 transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block font-cormorant text-white/60 text-sm tracking-widest uppercase mb-2">
                {r.email}
              </label>
              <input
                type="email"
                value={form.contact_email}
                onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                className="w-full bg-black/50 border border-gold/20 rounded-lg px-4 py-3 font-cormorant text-white text-base focus:outline-none focus:border-gold/50 transition-colors"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="block font-cormorant text-white/60 text-sm tracking-widest uppercase mb-2">
                {r.phone}
              </label>
              <input
                type="tel"
                value={form.contact_phone}
                onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                className="w-full bg-black/50 border border-gold/20 rounded-lg px-4 py-3 font-cormorant text-white text-base focus:outline-none focus:border-gold/50 transition-colors"
                placeholder="+243..."
              />
            </div>
          </div>

          <div>
            <label className="block font-cormorant text-white/60 text-sm tracking-widest uppercase mb-2">
              {r.message}
            </label>
            <textarea
              rows={3}
              value={form.rsvp_message}
              onChange={(e) => setForm({ ...form, rsvp_message: e.target.value })}
              className="w-full bg-black/50 border border-gold/20 rounded-lg px-4 py-3 font-cormorant text-white text-base focus:outline-none focus:border-gold/50 transition-colors resize-none"
              placeholder={r.messagePlaceholder}
            />
          </div>

          {status === 'not_found' && (
            <p className="font-cormorant text-amber-400/80 text-base italic text-center">
              {r.notFound}
            </p>
          )}
          {status === 'error' && (
            <p className="font-cormorant text-red-400/80 text-base italic text-center">
              {r.error}
            </p>
          )}

          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-gold/80 to-gold hover:from-gold hover:to-amber-400 text-black font-cinzel text-sm font-bold tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {status === 'loading' ? (
              <span className="animate-pulse">{r.sending}</span>
            ) : (
              <>
                <Send className="w-4 h-4" />
                {r.submit}
              </>
            )}
          </button>
        </form>
      </div>
    </section>
  );
}
