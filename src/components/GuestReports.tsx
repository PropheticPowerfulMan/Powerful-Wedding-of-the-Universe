import { useMemo } from 'react';
import {
  BarChart3,
  PieChart,
  Users,
  Heart,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import type { Guest } from '../types';
import { useGuestStatistics } from '../hooks/useGuestFiltering';

interface ChartDataItem {
  label: string;
  value: number;
  percentage: number;
  color: string;
}

const reportIconClass: Record<string, string> = {
  'from-blue-500': 'text-blue-500',
  'from-green-500': 'text-green-500',
  'from-yellow-500': 'text-yellow-500',
  'from-red-500': 'text-red-500',
  red: 'text-red-400',
  blue: 'text-blue-400',
  purple: 'text-purple-400',
};

export default function GuestReports({ guests }: { guests: Guest[] }) {
  const stats = useGuestStatistics(guests);

  // Données pour le graphique par type
  const typeChartData: ChartDataItem[] = useMemo(() => {
    const total = stats.total || 1;
    return [
      {
        label: 'Famille',
        value: stats.family,
        percentage: Math.round((stats.family / total) * 100),
        color: 'from-red-500 to-red-600',
      },
      {
        label: 'Amis',
        value: stats.friends,
        percentage: Math.round((stats.friends / total) * 100),
        color: 'from-blue-500 to-blue-600',
      },
      {
        label: 'Travail',
        value: stats.work,
        percentage: Math.round((stats.work / total) * 100),
        color: 'from-purple-500 to-purple-600',
      },
    ];
  }, [stats]);

  // Données pour le graphique de réponses
  const rsvpChartData: ChartDataItem[] = useMemo(() => {
    const total = stats.total || 1;
    return [
      {
        label: 'Présents',
        value: stats.attending,
        percentage: Math.round((stats.attending / total) * 100),
        color: 'from-green-500 to-green-600',
      },
      {
        label: 'En attente',
        value: stats.pending,
        percentage: Math.round((stats.pending / total) * 100),
        color: 'from-yellow-500 to-yellow-600',
      },
      {
        label: 'Absents',
        value: stats.notAttending,
        percentage: Math.round((stats.notAttending / total) * 100),
        color: 'from-red-500 to-red-600',
      },
    ];
  }, [stats]);

  return (
    <div className="bg-black text-white min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* En-tête */}
        <div className="text-center">
          <h1 className="font-cinzel text-4xl font-bold text-white mb-2">Rapport des Invités</h1>
          <p className="text-white/60 font-cormorant text-lg">
            Vue d'ensemble complète de votre liste d'invités
          </p>
        </div>

        {/* Statistiques clés */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatBox
            icon={Users}
            label="Total d'invités"
            value={stats.total}
            color="from-blue-500"
          />
          <StatBox
            icon={CheckCircle}
            label="Présents"
            value={stats.attending}
            subtext={`${Math.round((stats.attending / (stats.total || 1)) * 100)}%`}
            color="from-green-500"
          />
          <StatBox
            icon={Clock}
            label="En attente"
            value={stats.pending}
            subtext={`${Math.round((stats.pending / (stats.total || 1)) * 100)}%`}
            color="from-yellow-500"
          />
          <StatBox
            icon={XCircle}
            label="Absents"
            value={stats.notAttending}
            subtext={`${Math.round((stats.notAttending / (stats.total || 1)) * 100)}%`}
            color="from-red-500"
          />
        </div>

        {/* Graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Graphique par type */}
          <div className="border border-gold/20 rounded-lg bg-black/40 p-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-gold" />
              <h2 className="font-cinzel text-xl font-bold">Distribution par type</h2>
            </div>
            <div className="space-y-3">
              {typeChartData.map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-white/70">{item.label}</span>
                    <span className="font-cinzel font-bold text-gold">
                      {item.value} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${item.color}`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Graphique de réponses */}
          <div className="border border-gold/20 rounded-lg bg-black/40 p-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="w-5 h-5 text-gold" />
              <h2 className="font-cinzel text-xl font-bold">Statut des réponses</h2>
            </div>
            <div className="space-y-3">
              {rsvpChartData.map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-white/70">{item.label}</span>
                    <span className="font-cinzel font-bold text-gold">
                      {item.value} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${item.color}`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Statistiques détaillées par type */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['family', 'friends', 'work'] as const).map((type) => (
            <DetailedTypeCard
              key={type}
              icon={type === 'family' ? Heart : type === 'friends' ? Users : Calendar}
              stats={stats.byType[type]}
              label={type === 'family' ? 'Famille' : type === 'friends' ? 'Amis' : 'Travail'}
              color={
                type === 'family'
                  ? 'red'
                  : type === 'friends'
                    ? 'blue'
                    : 'purple'
              }
            />
          ))}
        </div>

        {/* Résumé texte */}
        <div className="border border-gold/20 rounded-lg bg-black/40 p-6 space-y-4">
          <h2 className="font-cinzel text-xl font-bold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-gold" />
            Résumé
          </h2>
          <div className="space-y-2 text-white/70 font-cormorant text-base leading-relaxed">
            <p>
              Vous avez actuellement <span className="text-gold font-bold">{stats.total}</span> invités enregistrés.
            </p>
            <p>
              <span className="text-green-400 font-bold">{stats.attending}</span> ont confirmé leur présence
              {stats.attending > 0 && ` (${Math.round((stats.attending / stats.total) * 100)}%)`}.
            </p>
            <p>
              <span className="text-yellow-400 font-bold">{stats.pending}</span> réponses sont en attente
              {stats.pending > 0 && ` (${Math.round((stats.pending / stats.total) * 100)}%)`}.
            </p>
            <p>
              <span className="text-red-400 font-bold">{stats.notAttending}</span> ont décliné
              {stats.notAttending > 0 && ` (${Math.round((stats.notAttending / stats.total) * 100)}%)`}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({
  icon: Icon,
  label,
  value,
  subtext,
  color,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  subtext?: string;
  color: string;
}) {
  return (
    <div className={`p-6 rounded-lg border border-gold/20 bg-gradient-to-br ${color}/10 to-black/40`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white/60 text-sm font-semibold">{label}</p>
          <p className="text-3xl font-cinzel font-bold text-white mt-2">{value}</p>
          {subtext && <p className="text-gold text-sm mt-1">{subtext}</p>}
        </div>
        <Icon className={`w-8 h-8 ${reportIconClass[color] ?? 'text-white'}`} />
      </div>
    </div>
  );
}

function DetailedTypeCard({
  icon: Icon,
  stats,
  label,
  color,
}: {
  icon: LucideIcon;
  stats: { total: number; attending: number; pending: number; notAttending: number };
  label: string;
  color: string;
}) {
  const total = stats.total || 1;
  return (
    <div className="border border-gold/20 rounded-lg bg-black/40 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Icon className={`w-5 h-5 ${reportIconClass[color] ?? 'text-white'}`} />
        <h3 className="font-cinzel font-bold text-white">{label}</h3>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-white/60">Total</span>
          <span className="font-bold text-white">{stats.total}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-white/60">Présents</span>
          <span className="font-bold text-green-400">
            {stats.attending} ({Math.round((stats.attending / total) * 100)}%)
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-white/60">En attente</span>
          <span className="font-bold text-yellow-400">
            {stats.pending} ({Math.round((stats.pending / total) * 100)}%)
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-white/60">Absents</span>
          <span className="font-bold text-red-400">
            {stats.notAttending} ({Math.round((stats.notAttending / total) * 100)}%)
          </span>
        </div>
      </div>
    </div>
  );
}
