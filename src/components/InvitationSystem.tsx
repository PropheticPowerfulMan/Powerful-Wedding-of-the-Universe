import { useState } from 'react';
import { Search, ShieldAlert, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Guest } from '../types';
import InvitationCard from './InvitationCard';
import { useLanguage } from '../contexts/LanguageContext';

type SearchState = 'idle' | 'loading' | 'found' | 'not_found' | 'error';

export default function InvitationSystem() {
  const [form, setForm] = useState({ first_name: '', last_name: '', post_name: '' });
  const [searchState, setSearchState] = useState<SearchState>('idle');
  const [guest, setGuest] = useState<Guest | null>(null);

  const { t } = useLanguage();
  const inv = t.invitation;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim()) return;

    setSearchState('loading');

    try {
      let query = supabase
        .from('guests')
        .select('*')
        .ilike('first_name', form.first_name.trim())
        .ilike('last_name', form.last_name.trim());

      if (form.post_name.trim()) {
        query = query.ilike('post_name', form.post_name.trim());
      }

      const { data, error } = await query;

      if (error) {
        setSearchState('error');
        return;
      }

      if (!data || data.length === 0) {
        setSearchState('not_found');
        return;
      }

      setGuest(data[0] as Guest);
      setSearchState('found');
    } catch {
      setSearchState('error');
    }
  };

  const handleClose = () => {
    setGuest(null);
    setSearchState('idle');
  };

  return (
    <section id="invitation" className="relative py-24 px-6 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-navy/15 via-black to-black" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-gold/4 blur-3xl" />

      <div className="relative z-10 max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <span className="font-cormorant text-gold/60 text-sm tracking-widest uppercase">
            {inv.eyebrow}
          </span>
          <h2 className="font-cinzel text-4xl md:text-5xl font-bold text-white mt-2 mb-4">
            {inv.title}
          </h2>
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px w-20 bg-gradient-to-r from-transparent to-gold/50" />
            <div className="w-2 h-2 rounded-full bg-gold" />
            <div className="h-px w-20 bg-gradient-to-l from-transparent to-gold/50" />
          </div>
          <p className="font-cormorant text-white/55 text-lg leading-relaxed">
            {inv.description}
          </p>
        </div>

        <form
          onSubmit={handleSearch}
          className="border border-gold/25 rounded-2xl p-8 backdrop-blur-sm bg-black/50 space-y-5"
          style={{ boxShadow: '0 0 40px rgba(212,175,55,0.05)' }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="block font-cormorant text-white/60 text-sm tracking-widest uppercase mb-2">
                {inv.firstName} *
              </label>
              <input
                type="text"
                required
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                className="w-full bg-black/60 border border-gold/20 rounded-lg px-4 py-3 font-cormorant text-white text-base focus:outline-none focus:border-gold/60 transition-colors placeholder:text-white/20"
                placeholder="e.g. Jean"
              />
            </div>
            <div>
              <label className="block font-cormorant text-white/60 text-sm tracking-widest uppercase mb-2">
                {inv.postName}{' '}
                <span className="text-white/30 normal-case tracking-normal">({inv.postNameOptional})</span>
              </label>
              <input
                type="text"
                value={form.post_name}
                onChange={(e) => setForm({ ...form, post_name: e.target.value })}
                className="w-full bg-black/60 border border-gold/20 rounded-lg px-4 py-3 font-cormorant text-white text-base focus:outline-none focus:border-gold/60 transition-colors placeholder:text-white/20"
                placeholder="e.g. Emmanuel"
              />
            </div>
            <div>
              <label className="block font-cormorant text-white/60 text-sm tracking-widest uppercase mb-2">
                {inv.lastName} *
              </label>
              <input
                type="text"
                required
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                className="w-full bg-black/60 border border-gold/20 rounded-lg px-4 py-3 font-cormorant text-white text-base focus:outline-none focus:border-gold/60 transition-colors placeholder:text-white/20"
                placeholder="e.g. Mukendi"
              />
            </div>
          </div>

          {searchState === 'not_found' && (
            <div className="flex items-start gap-3 border border-amber-500/30 rounded-lg p-4 bg-amber-900/10">
              <ShieldAlert className="w-5 h-5 text-amber-400/70 flex-shrink-0 mt-0.5" />
              <p className="font-cormorant text-amber-200/70 text-base leading-relaxed">
                {inv.notFound}
              </p>
            </div>
          )}

          {searchState === 'error' && (
            <div className="border border-red-500/30 rounded-lg p-4 bg-red-900/10">
              <p className="font-cormorant text-red-200/70 text-base">
                {inv.error}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={searchState === 'loading'}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-gold/80 to-gold hover:from-gold hover:to-amber-400 text-black font-cinzel text-sm font-bold tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 shadow-[0_0_30px_rgba(212,175,55,0.2)]"
          >
            {searchState === 'loading' ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                {inv.verifying}
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                {inv.submit}
              </>
            )}
          </button>
        </form>

        <p className="text-center font-cormorant text-white/30 text-sm mt-5 italic">
          {inv.hint}
        </p>
      </div>

      {searchState === 'found' && guest && (
        <InvitationCard guest={guest} onClose={handleClose} />
      )}
    </section>
  );
}
