import { useMemo } from 'react';
import type { Guest } from '../types';

export type PersonType = 'family' | 'friends' | 'work';
export type InvitationStatus = 'pending' | 'sent' | 'confirmed';
export type RSVPStatus = 'pending' | 'attending' | 'not_attending' | 'maybe';

export interface FilterState {
  personType: PersonType | 'all';
  couple: 'all' | 'couple' | 'not_couple';
  invitationStatus: InvitationStatus | 'all';
  rsvpStatus: RSVPStatus | 'all';
  searchTerm: string;
  sortBy: 'alphabetic' | 'created' | 'name';
}

export interface Statistics {
  total: number;
  family: number;
  friends: number;
  work: number;
  attending: number;
  notAttending: number;
  pending: number;
  invited: number;
  byType: {
    family: { total: number; attending: number; pending: number; notAttending: number };
    friends: { total: number; attending: number; pending: number; notAttending: number };
    work: { total: number; attending: number; pending: number; notAttending: number };
  };
}

export function useGuestFiltering(guests: Guest[], filters: FilterState) {
  return useMemo(() => {
    let result = [...guests];

    // Appliquer les filtres
    if (filters.personType !== 'all') {
      result = result.filter((g) => g.person_type === filters.personType);
    }
    if (filters.couple !== 'all') {
      result = result.filter((g) => (filters.couple === 'couple' ? g.is_couple : !g.is_couple));
    }
    if (filters.invitationStatus !== 'all') {
      result = result.filter((g) => g.invitation_status === filters.invitationStatus);
    }
    if (filters.rsvpStatus !== 'all') {
      result = result.filter((g) => g.rsvp_status === filters.rsvpStatus);
    }

    // Recherche par texte
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      result = result.filter(
        (g) =>
          g.first_name.toLowerCase().includes(term) ||
          g.last_name.toLowerCase().includes(term) ||
          g.post_name.toLowerCase().includes(term) ||
          g.group_name.toLowerCase().includes(term)
      );
    }

    // Tri
    if (filters.sortBy === 'alphabetic') {
      result.sort((a, b) => {
        const fullNameA = `${a.last_name} ${a.first_name}`;
        const fullNameB = `${b.last_name} ${b.first_name}`;
        return fullNameA.localeCompare(fullNameB, 'fr-FR');
      });
    } else if (filters.sortBy === 'name') {
      result.sort((a, b) => a.first_name.localeCompare(b.first_name, 'fr-FR'));
    } else if (filters.sortBy === 'created') {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result;
  }, [guests, filters]);
}

export function useGuestStatistics(guests: Guest[]): Statistics {
  return useMemo(() => {
    const stats: Statistics = {
      total: guests.length,
      family: guests.filter((g) => g.person_type === 'family').length,
      friends: guests.filter((g) => g.person_type === 'friends').length,
      work: guests.filter((g) => g.person_type === 'work').length,
      attending: guests.filter((g) => g.rsvp_status === 'attending').length,
      notAttending: guests.filter((g) => g.rsvp_status === 'not_attending').length,
      pending: guests.filter((g) => g.rsvp_status === 'pending').length,
      invited: guests.filter((g) => g.invitation_status === 'sent').length,
      byType: {
        family: {
          total: 0,
          attending: 0,
          pending: 0,
          notAttending: 0,
        },
        friends: {
          total: 0,
          attending: 0,
          pending: 0,
          notAttending: 0,
        },
        work: {
          total: 0,
          attending: 0,
          pending: 0,
          notAttending: 0,
        },
      },
    };

    // Calculer les statistiques par type
    guests.forEach((guest) => {
      const typeStats = stats.byType[guest.person_type];
      typeStats.total++;

      if (guest.rsvp_status === 'attending') typeStats.attending++;
      else if (guest.rsvp_status === 'pending') typeStats.pending++;
      else if (guest.rsvp_status === 'not_attending') typeStats.notAttending++;
    });

    return stats;
  }, [guests]);
}
