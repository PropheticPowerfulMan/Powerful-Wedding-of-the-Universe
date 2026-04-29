import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  RotateCcw,
  Users,
  Heart,
  Briefcase,
  CheckCircle,
  Clock,
  XCircle,
  HelpCircle,
  Download,
  Trash2,
  Edit2,
  Tag,
  type LucideIcon,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Guest } from '../types';

type PersonType = 'family' | 'friends' | 'work';
type InvitationStatus = 'pending' | 'sent' | 'confirmed';
type RSVPStatus = 'pending' | 'attending' | 'not_attending' | 'maybe';

interface FilterState {
  personType: PersonType | 'all';
  couple: 'all' | 'couple' | 'not_couple';
  invitationStatus: InvitationStatus | 'all';
  rsvpStatus: RSVPStatus | 'all';
  searchTerm: string;
  sortBy: 'alphabetic' | 'created' | 'name';
}

interface Statistics {
  totalPeople: number;
  family: number;
  friends: number;
  work: number;
  attendingPeople: number;
  notAttendingPeople: number;
  pendingPeople: number;
  invited: number;
}

const statCardIconClass: Record<string, string> = {
  'from-blue-500': 'text-blue-500',
  'from-red-500': 'text-red-500',
  'from-purple-500': 'text-purple-500',
  'from-green-500': 'text-green-500',
  'from-yellow-500': 'text-yellow-500',
  'from-gold': 'text-gold',
};

const personTypeLabel = (type: PersonType) => {
  if (type === 'family') return 'Famille';
  if (type === 'friends') return 'Amis';
  return 'Travail';
};

const invitationStatusLabel = (status: InvitationStatus) => {
  if (status === 'pending') return 'En attente';
  if (status === 'sent') return 'Envoyée';
  return 'Confirmée';
};

const rsvpStatusLabel = (status: RSVPStatus) => {
  if (status === 'pending') return 'En attente';
  if (status === 'attending') return 'Présent';
  if (status === 'not_attending') return 'Absent';
  return 'Peut-être';
};

export default function GuestManager() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FilterState>({
    personType: 'all',
    couple: 'all',
    invitationStatus: 'all',
    rsvpStatus: 'all',
    searchTerm: '',
    sortBy: 'alphabetic',
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<Partial<Guest>>({});
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const loadGuests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('guests').select('*');
      if (error) throw error;
      setGuests((data as Guest[]) || []);
    } catch (error) {
      console.error('Erreur lors du chargement des invites :', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadGuests();
  }, []);

  const peopleCountForGuest = (guest: Guest) => {
    const reported = Number.isFinite(guest.number_of_guests) ? Math.max(0, guest.number_of_guests) : 0;
    const minimum = guest.is_couple ? 2 : 1;
    return Math.max(reported, minimum);
  };

  // Calcul des statistiques
  const stats: Statistics = useMemo(() => {
    return {
      totalPeople: guests.reduce((sum, g) => sum + peopleCountForGuest(g), 0),
      family: guests.filter((g) => g.person_type === 'family').length,
      friends: guests.filter((g) => g.person_type === 'friends').length,
      work: guests.filter((g) => g.person_type === 'work').length,
      attendingPeople: guests
        .filter((g) => g.rsvp_status === 'attending')
        .reduce((sum, g) => sum + peopleCountForGuest(g), 0),
      notAttendingPeople: guests
        .filter((g) => g.rsvp_status === 'not_attending')
        .reduce((sum, g) => sum + peopleCountForGuest(g), 0),
      pendingPeople: guests
        .filter((g) => g.rsvp_status === 'pending')
        .reduce((sum, g) => sum + peopleCountForGuest(g), 0),
      invited: guests.filter((g) => g.invitation_status === 'sent').length,
    };
  }, [guests]);

  // Filtrage et tri
  const filteredGuests = useMemo(() => {
    let result = [...guests];

    // Appliquer les filtres
    if (filter.personType !== 'all') {
      result = result.filter((g) => g.person_type === filter.personType);
    }
    if (filter.couple !== 'all') {
      result = result.filter((g) => (filter.couple === 'couple' ? g.is_couple : !g.is_couple));
    }
    if (filter.invitationStatus !== 'all') {
      result = result.filter((g) => g.invitation_status === filter.invitationStatus);
    }
    if (filter.rsvpStatus !== 'all') {
      result = result.filter((g) => g.rsvp_status === filter.rsvpStatus);
    }

    // Recherche par texte
    if (filter.searchTerm) {
      const term = filter.searchTerm.toLowerCase();
      result = result.filter(
        (g) =>
          g.first_name.toLowerCase().includes(term) ||
          g.last_name.toLowerCase().includes(term) ||
          g.post_name.toLowerCase().includes(term) ||
          g.group_name.toLowerCase().includes(term)
      );
    }

    // Tri
    if (filter.sortBy === 'alphabetic') {
      result.sort((a, b) => {
        const fullNameA = `${a.last_name} ${a.first_name}`;
        const fullNameB = `${b.last_name} ${b.first_name}`;
        return fullNameA.localeCompare(fullNameB, 'fr-FR');
      });
    } else if (filter.sortBy === 'name') {
      result.sort((a, b) => a.first_name.localeCompare(b.first_name, 'fr-FR'));
    } else if (filter.sortBy === 'created') {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result;
  }, [guests, filter]);

  const resetFilters = () => {
    setFilter({
      personType: 'all',
      couple: 'all',
      invitationStatus: 'all',
      rsvpStatus: 'all',
      searchTerm: '',
      sortBy: 'alphabetic',
    });
  };

  const updateGuest = async (id: string, updates: Partial<Guest>) => {
    try {
      const { error } = await supabase.from('guests').update(updates).eq('id', id);
      if (error) throw error;
      setGuests((prev) => prev.map((g) => (g.id === id ? { ...g, ...updates } : g)));
      setEditingId(null);
    } catch (error) {
      console.error('Erreur lors de la mise a jour de l\'invite :', error);
    }
  };

  const deleteGuest = async (id: string) => {
    if (!confirm('❌ Êtes-vous certain de vouloir supprimer cet invité ?')) return;
    try {
      const { error } = await supabase.from('guests').delete().eq('id', id);
      if (error) throw error;
      setGuests((prev) => prev.filter((g) => g.id !== id));
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'invite :', error);
    }
  };

  const exportAsCSV = () => {
    const headers = [
      'Prénom',
      'Nom',
      'Post-nom',
      'Groupe',
      'Type',
      'Invitation',
      'RSVP',
      'Repas',
      'Nombre d\'invités',
      'Notes',
    ];
    const rows = filteredGuests.map((g) => [
      g.first_name,
      g.last_name,
      g.post_name,
      g.group_name,
      g.person_type,
      g.invitation_status,
      g.rsvp_status,
      g.meal_preference,
      g.number_of_guests,
      g.notes,
    ]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invites_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-black text-white min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* En-tête */}
        <div className="text-center">
          <h1 className="font-cinzel text-4xl font-bold text-white mb-2">Gestionnaire d'Invités</h1>
          <p className="text-white/60 font-cormorant text-lg">
            Gérez et organisez complètement votre liste d'invités
          </p>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total (personnes)" value={stats.totalPeople} color="from-blue-500" />
          <StatCard icon={Heart} label="Famille" value={stats.family} color="from-red-500" />
          <StatCard icon={Users} label="Amis" value={stats.friends} color="from-blue-500" />
          <StatCard icon={Briefcase} label="Travail" value={stats.work} color="from-purple-500" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={CheckCircle}
            label="Présents (personnes)"
            value={stats.attendingPeople}
            color="from-green-500"
          />
          <StatCard icon={Clock} label="En attente (personnes)" value={stats.pendingPeople} color="from-yellow-500" />
          <StatCard
            icon={XCircle}
            label="Absents (personnes)"
            value={stats.notAttendingPeople}
            color="from-red-500"
          />
          <StatCard icon={Tag} label="Invités" value={stats.invited} color="from-gold" />
        </div>

        {/* Barre de recherche et filtres */}
        <div className="space-y-4">
          <div className="flex gap-3 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type="text"
                placeholder="Rechercher un invité..."
                value={filter.searchTerm}
                onChange={(e) => setFilter({ ...filter, searchTerm: e.target.value })}
                className="w-full bg-black/60 border border-gold/20 rounded-lg pl-10 pr-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-gold/60"
              />
            </div>
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="p-3 rounded-lg border border-gold/20 hover:border-gold/60 transition-colors"
            >
              <Filter className="w-5 h-5 text-gold" />
            </button>
            <button
              onClick={resetFilters}
              className="p-3 rounded-lg border border-gold/20 hover:border-gold/60 transition-colors"
            >
              <RotateCcw className="w-5 h-5 text-gold" />
            </button>
            <button
              onClick={exportAsCSV}
              className="p-3 rounded-lg border border-gold/20 hover:border-gold/60 transition-colors"
            >
              <Download className="w-5 h-5 text-gold" />
            </button>
          </div>

          {/* Filtres avancés */}
          {showAdvancedFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-4 rounded-lg border border-gold/20 bg-black/40">
              {/* Type de personne */}
              <div>
                <label className="block text-white/70 text-sm font-semibold mb-2">Type</label>
                <select
                  value={filter.personType}
                  onChange={(e) =>
                    setFilter({ ...filter, personType: e.target.value as FilterState['personType'] })
                  }
                  className="w-full bg-black/60 border border-gold/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/60"
                >
                  <option value="all">Tous les types</option>
                  <option value="family">{personTypeLabel('family')}</option>
                  <option value="friends">{personTypeLabel('friends')}</option>
                  <option value="work">{personTypeLabel('work')}</option>
                </select>
              </div>

              {/* Statut d'invitation */}
              <div>
                <label className="block text-white/70 text-sm font-semibold mb-2">Invitation</label>
                <select
                  value={filter.invitationStatus}
                  onChange={(e) =>
                    setFilter({
                      ...filter,
                      invitationStatus: e.target.value as FilterState['invitationStatus'],
                    })
                  }
                  className="w-full bg-black/60 border border-gold/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/60"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="pending">{invitationStatusLabel('pending')}</option>
                  <option value="sent">{invitationStatusLabel('sent')}</option>
                  <option value="confirmed">{invitationStatusLabel('confirmed')}</option>
                </select>
              </div>

              <div>
                <label className="block text-white/70 text-sm font-semibold mb-2">Couple</label>
                <select
                  value={filter.couple}
                  onChange={(e) =>
                    setFilter({ ...filter, couple: e.target.value as FilterState['couple'] })
                  }
                  className="w-full bg-black/60 border border-gold/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/60"
                >
                  <option value="all">Tous</option>
                  <option value="couple">Couples</option>
                  <option value="not_couple">Non-couples</option>
                </select>
              </div>

              {/* Statut RSVP */}
              <div>
                <label className="block text-white/70 text-sm font-semibold mb-2">RSVP</label>
                <select
                  value={filter.rsvpStatus}
                  onChange={(e) =>
                    setFilter({ ...filter, rsvpStatus: e.target.value as FilterState['rsvpStatus'] })
                  }
                  className="w-full bg-black/60 border border-gold/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/60"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="pending">{rsvpStatusLabel('pending')}</option>
                  <option value="attending">{rsvpStatusLabel('attending')}</option>
                  <option value="not_attending">{rsvpStatusLabel('not_attending')}</option>
                  <option value="maybe">{rsvpStatusLabel('maybe')}</option>
                </select>
              </div>

              {/* Tri */}
              <div>
                <label className="block text-white/70 text-sm font-semibold mb-2">Trier par</label>
                <select
                  value={filter.sortBy}
                  onChange={(e) =>
                    setFilter({ ...filter, sortBy: e.target.value as FilterState['sortBy'] })
                  }
                  className="w-full bg-black/60 border border-gold/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/60"
                >
                  <option value="alphabetic">Alphabétique (Nom, Prénom)</option>
                  <option value="name">Prénom</option>
                  <option value="created">Date d'ajout</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Résultats */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-cinzel text-gold">
              {filteredGuests.length} invité{filteredGuests.length !== 1 ? 's' : ''} trouvé
              {filteredGuests.length > 1 ? 's' : ''}
            </h2>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin">
                <Clock className="w-8 h-8 text-gold" />
              </div>
              <p className="text-white/60 mt-4">Chargement...</p>
            </div>
          ) : filteredGuests.length === 0 ? (
            <div className="text-center py-12 border border-gold/20 rounded-lg bg-black/40">
              <Users className="w-12 h-12 text-white/30 mx-auto mb-4" />
              <p className="text-white/60">Aucun invité ne correspond à vos critères.</p>
              <button
                onClick={resetFilters}
                className="mt-4 text-gold hover:text-gold/80 transition-colors flex items-center gap-2 mx-auto"
              >
                <RotateCcw className="w-4 h-4" />
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredGuests.map((guest) => (
                <GuestRow
                  key={guest.id}
                  guest={guest}
                  isEditing={editingId === guest.id}
                  onEdit={() => {
                    setEditingId(guest.id);
                    setEditingData(guest);
                  }}
                  onSave={(updates) => updateGuest(guest.id, updates)}
                  onCancel={() => setEditingId(null)}
                  onDelete={() => deleteGuest(guest.id)}
                  editingData={editingData}
                  setEditingData={setEditingData}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className={`p-4 rounded-lg border border-gold/20 bg-gradient-to-br ${color}/10 to-black/40`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/60 text-sm font-semibold">{label}</p>
          <p className="text-3xl font-cinzel font-bold text-white mt-1">{value}</p>
        </div>
        <Icon className={`w-8 h-8 ${statCardIconClass[color] ?? 'text-white'}`} />
      </div>
    </div>
  );
}

function GuestRow({
  guest,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  editingData,
  setEditingData,
}: {
  guest: Guest;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (updates: Partial<Guest>) => void;
  onCancel: () => void;
  onDelete: () => void;
  editingData: Partial<Guest>;
  setEditingData: (data: Partial<Guest>) => void;
}) {
  const typeIcon = {
    family: Heart,
    friends: Users,
    work: Briefcase,
  }[guest.person_type] || Users;

  const TypeIcon = typeIcon;

  const invitationIcon = {
    pending: Clock,
    sent: CheckCircle,
    confirmed: CheckCircle,
  }[guest.invitation_status] || Clock;

  const InvitationIcon = invitationIcon;

  const rsvpIcon = {
    pending: HelpCircle,
    attending: CheckCircle,
    not_attending: XCircle,
    maybe: HelpCircle,
  }[guest.rsvp_status] || HelpCircle;

  const RSVPIcon = rsvpIcon;

  if (isEditing) {
    return (
      <div className="p-4 rounded-lg border border-gold/20 bg-black/60 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Prénom"
            value={editingData.first_name || ''}
            onChange={(e) => setEditingData({ ...editingData, first_name: e.target.value })}
            className="bg-black/60 border border-gold/20 rounded px-3 py-2 text-white text-sm"
          />
          <input
            type="text"
            placeholder="Nom"
            value={editingData.last_name || ''}
            onChange={(e) => setEditingData({ ...editingData, last_name: e.target.value })}
            className="bg-black/60 border border-gold/20 rounded px-3 py-2 text-white text-sm"
          />
          <select
            value={editingData.person_type || 'family'}
            onChange={(e) =>
              setEditingData({ ...editingData, person_type: e.target.value as PersonType })
            }
            className="bg-black/60 border border-gold/20 rounded px-3 py-2 text-white text-sm"
          >
            <option value="family">{personTypeLabel('family')}</option>
            <option value="friends">{personTypeLabel('friends')}</option>
            <option value="work">{personTypeLabel('work')}</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onSave(editingData)}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
          >
            Enregistrer
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors"
          >
            Annuler
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg border border-gold/20 bg-black/40 hover:bg-black/60 transition-colors">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <h3 className="font-cinzel text-lg font-bold text-white">
            {guest.last_name} {guest.first_name}
          </h3>
          {guest.post_name && (
            <p className="text-white/60 text-sm">Post-nom: {guest.post_name}</p>
          )}
          {guest.group_name && (
            <p className="text-white/60 text-sm">Groupe: {guest.group_name}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-1 text-white/60 text-sm">
            <TypeIcon className="w-4 h-4 text-gold" />
            {personTypeLabel(guest.person_type)}
          </div>

          <div className="flex items-center gap-1 text-white/60 text-sm">
            <InvitationIcon className="w-4 h-4 text-blue-400" />
            {invitationStatusLabel(guest.invitation_status)}
          </div>

          <div className="flex items-center gap-1 text-white/60 text-sm">
            <RSVPIcon className="w-4 h-4 text-green-400" />
            {rsvpStatusLabel(guest.rsvp_status)}
          </div>

          {guest.number_of_guests > 1 && (
            <div className="text-white/60 text-sm bg-black/60 px-2 py-1 rounded">
              +{guest.number_of_guests - 1}
            </div>
          )}

          <button
            onClick={onEdit}
            className="p-2 rounded hover:bg-gold/10 transition-colors text-gold"
          >
            <Edit2 className="w-4 h-4" />
          </button>

          <button
            onClick={onDelete}
            className="p-2 rounded hover:bg-red-500/10 transition-colors text-red-400"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
