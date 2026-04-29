import { useState, useEffect, useMemo, useCallback } from 'react';
import { Upload, Users, CheckCircle, Clock, XCircle, Lock, Trash2, RefreshCw, Download, MessageCircle, Mail, History, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase, supabaseAnonKey, supabaseUrl } from '../lib/supabase';
import type { Guest } from '../types';

const ADMIN_PASSWORD = 'powerful2026';
const ADMIN_STORAGE_PREFIX = 'wedding-admin';
const ADMIN_COLLAPSED_SECTIONS_KEY = `${ADMIN_STORAGE_PREFIX}:collapsed-sections`;
const ADMIN_ACTIVE_TAB_KEY = `${ADMIN_STORAGE_PREFIX}:active-tab`;
const ADMIN_COMPACT_TABLE_KEY = `${ADMIN_STORAGE_PREFIX}:compact-table`;
const ADMIN_QUICK_SEARCH_HISTORY_KEY = `${ADMIN_STORAGE_PREFIX}:quick-search-history`;
const ADMIN_SESSION_LOGS_KEY = `${ADMIN_STORAGE_PREFIX}:session-logs`;

type AdminTab = 'guests' | 'upload';
type AdminSectionId = 'dashboard' | 'journal' | 'workspace' | 'invitations';
type PersonType = Guest['person_type'];
type GenderFilter = Guest['gender'] | 'all';
type InvitationStatusFilter = Guest['invitation_status'] | 'all';
type RSVPStatusFilter = Guest['rsvp_status'] | 'all';
type GuestsCountFilter = 'all' | 'solo' | 'pair' | 'group' | 'couple';
type BulkRsvpFilter = Guest['rsvp_status'] | 'all';
type BulkTypeFilter = Guest['person_type'] | 'all';
type BulkCoupleFilter = 'all' | 'couple' | 'not_couple';
type InvitationChannelCombo = 'sms' | 'whatsapp' | 'email' | 'sms_whatsapp' | 'sms_email' | 'whatsapp_email' | 'sms_whatsapp_email';

type BulkGuestDetail = {
  guest_id: string;
  guest_name: string;
  sms?: {
    target: string;
    status: 'eligible' | 'sent' | 'failed' | 'skipped';
    reason?: string;
  };
  email?: {
    target: string;
    status: 'eligible' | 'sent' | 'failed' | 'skipped';
    reason?: string;
  };
};

type DirectGuestDetail = {
  guest_id: string;
  guest_name: string;
  sms?: {
    target: string;
    status: 'eligible' | 'sent' | 'failed' | 'skipped';
    reason?: string;
  };
  whatsapp?: {
    target: string;
    status: 'eligible' | 'sent' | 'failed' | 'skipped';
    reason?: string;
  };
  email?: {
    target: string;
    status: 'eligible' | 'sent' | 'failed' | 'skipped';
    reason?: string;
  };
};
type NewGuest = {
  first_name: string;
  last_name: string;
  post_name: string;
  person_type: PersonType;
  phone: string;
  email: string;
  gender: 'male' | 'female';
  // Couple
  is_couple: boolean;
  partner_first_name: string;
  partner_last_name: string;
  partner_post_name: string;
  partner_phone: string;
  partner_gender: 'male' | 'female';
};

type CsvLineAction = 'added' | 'updated' | 'ignored';

type CsvLineReport = {
  line: number;
  fullName: string;
  action: CsvLineAction;
  reason: string;
};

type DispatchChannel = 'email' | 'whatsapp' | 'sms';
type DispatchStatus = 'eligible' | 'sent' | 'delivered' | 'failed' | 'skipped';

type DispatchLogRow = {
  id: number;
  created_at: string;
  source_function: string;
  event_type: string;
  channel: DispatchChannel;
  recipient_type: 'guest' | 'host' | 'admin' | 'unknown';
  guest_name: string | null;
  target: string | null;
  status: DispatchStatus;
  error_message: string | null;
  dry_run: boolean;
  provider: string | null;
  provider_message_id: string | null;
  provider_status: string | null;
  provider_status_detail: string | null;
  provider_updated_at: string | null;
  delivered_at: string | null;
};

type NewDispatchLogRow = {
  source_function: string;
  event_type: string;
  channel: DispatchChannel;
  recipient_type: DispatchLogRow['recipient_type'];
  guest_name: string | null;
  target: string | null;
  status: DispatchStatus;
  error_message: string | null;
  dry_run: boolean;
  provider: string | null;
  provider_message_id?: string | null;
  provider_status?: string | null;
  provider_status_detail?: string | null;
  provider_updated_at?: string | null;
  delivered_at?: string | null;
};

const dispatchLogIdentityKey = (entry: {
  source_function: string;
  event_type: string;
  channel: DispatchChannel;
  recipient_type: DispatchLogRow['recipient_type'];
  guest_name: string | null;
  target: string | null;
  dry_run: boolean;
  provider: string | null;
}) =>
  [
    entry.source_function,
    entry.event_type,
    entry.channel,
    entry.recipient_type,
    entry.guest_name ?? '',
    entry.target ?? '',
    entry.dry_run ? '1' : '0',
    entry.provider ?? '',
  ].join('||');

const emptyGuest: NewGuest = {
  first_name: '',
  last_name: '',
  post_name: '',
  person_type: 'family',
  phone: '',
  email: '',
  gender: 'male',
  is_couple: false,
  partner_first_name: '',
  partner_last_name: '',
  partner_post_name: '',
  partner_phone: '',
  partner_gender: 'female',
};

const hasToken = (text: string, tokens: string[]) => {
  const escaped = tokens.map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(?:^|[^a-z])(?:${escaped})(?:[^a-z]|$)`, 'i');
  return regex.test(text);
};

const normalizeNamePart = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const guestNameKey = (firstName: unknown, lastName: unknown) =>
  `${normalizeNamePart(firstName)}|${normalizeNamePart(lastName)}`;

const normalizePersonType = (rawType: unknown, groupName?: string): PersonType => {
  const normalized = String(rawType ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (normalized === 'family' || normalized === 'famille') return 'family';
  if (normalized === 'friends' || normalized === 'friend' || normalized === 'amis' || normalized === 'ami') return 'friends';
  if (normalized === 'work' || normalized === 'travail' || normalized === 'collegue' || normalized === 'collegues') return 'work';

  const normalizedGroup = String(groupName ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (hasToken(normalizedGroup, ['famille', 'family'])) return 'family';
  if (hasToken(normalizedGroup, ['ami', 'amis', 'friend', 'friends'])) return 'friends';
  if (hasToken(normalizedGroup, ['travail', 'work', 'collegue', 'collegues', 'colleague', 'colleagues'])) return 'work';

  return 'family';
};

const stripUtf8Bom = (value: string) => value.replace(/^\uFEFF/, '');

const normalizeCsvHeader = (value: string) =>
  stripUtf8Bom(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_\s]+/g, ' ');

const splitCsvLine = (line: string, delimiter: ',' | ';') => {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells;
};

const countDelimiterOutsideQuotes = (line: string, delimiter: ',' | ';') => {
  let count = 0;
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      count++;
    }
  }

  return count;
};

const detectCsvDelimiter = (lines: string[]): ',' | ';' => {
  const sample = lines.slice(0, 5);
  const commaScore = sample.reduce((total, line) => total + countDelimiterOutsideQuotes(line, ','), 0);
  const semicolonScore = sample.reduce((total, line) => total + countDelimiterOutsideQuotes(line, ';'), 0);
  return semicolonScore > commaScore ? ';' : ',';
};

const escapeCsvCell = (value: unknown) => {
  const raw = String(value ?? '');
  if (/[",\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
};

const errorPrefix = 'Erreur:';

const simplifyTechnicalError = (raw?: string | null) => {
  if (!raw) return 'Détail technique indisponible.';

  const text = raw.toLowerCase();

  if (text.includes('failed to fetch') || text.includes('network') || text.includes('load failed')) {
    return 'Impossible de joindre le serveur. Vérifiez votre connexion Internet.';
  }
  if (text.includes('permission') || text.includes('rls') || text.includes('policy') || text.includes('not allowed')) {
    return 'Accès refusé. Vérifiez les autorisations de la base de données.';
  }
  if (text.includes('timeout')) {
    return 'Le serveur a mis trop de temps à répondre. Réessayez dans quelques instants.';
  }
  if (text.includes('invalid') || text.includes('malformed')) {
    return 'Une information envoyée au serveur n\'est pas valide.';
  }
  if (text.includes('http 5') || text.includes('internal') || text.includes('server')) {
    return 'Le serveur a rencontré un problème temporaire. Réessayez plus tard.';
  }

  return raw;
};

const userError = (headline: string, technical?: string | null) => {
  const details = simplifyTechnicalError(technical);
  return `${errorPrefix} ${headline}${details ? ` ${details}` : ''}`;
};

const personTypeLabel = (type: PersonType | 'all') => {
  if (type === 'family') return 'Famille';
  if (type === 'friends') return 'Amis';
  if (type === 'work') return 'Travail';
  return 'Tous les types';
};

const genderLabel = (gender: Guest['gender'] | 'all') => {
  if (gender === 'female') return 'Femme';
  if (gender === 'male') return 'Homme';
  return 'Tous les genres';
};

const invitationStatusLabel = (status: Guest['invitation_status'] | 'all') => {
  if (status === 'pending') return 'En attente';
  if (status === 'sent') return 'Envoyée';
  if (status === 'confirmed') return 'Confirmée';
  return 'Toutes les invitations';
};

const rsvpStatusLabel = (status: Guest['rsvp_status'] | 'all') => {
  if (status === 'pending') return 'En attente';
  if (status === 'attending') return 'Présent';
  if (status === 'not_attending') return 'Absent';
  if (status === 'maybe') return 'Peut-être';
  return 'Tous les RSVP';
};

const recipientTypeLabel = (recipientType: DispatchLogRow['recipient_type']) => {
  if (recipientType === 'guest') return 'Invite';
  if (recipientType === 'host') return 'Couple';
  if (recipientType === 'admin') return 'Administration';
  return 'Inconnu';
};

const isErrorMessage = (message: string | null) => Boolean(message?.startsWith(errorPrefix));

const invitationComboLabel = (combo: InvitationChannelCombo) => {
  if (combo === 'sms') return 'SMS';
  if (combo === 'whatsapp') return 'WhatsApp';
  if (combo === 'email') return 'E-mail';
  if (combo === 'sms_whatsapp') return 'SMS + WhatsApp';
  if (combo === 'sms_email') return 'SMS + E-mail';
  if (combo === 'whatsapp_email') return 'WhatsApp + E-mail';
  return 'SMS + WhatsApp + E-mail';
};

type AdminSectionCardProps = {
  id: string;
  title: React.ReactNode;
  subtitle: React.ReactNode;
  countLabel?: string;
  countValue?: number;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
};

function AdminSectionCard({
  id,
  title,
  subtitle,
  countLabel,
  countValue,
  collapsed,
  onToggle,
  children,
}: AdminSectionCardProps) {
  return (
    <section id={id} className="border border-gold/20 rounded-2xl p-5 md:p-6 backdrop-blur-sm bg-black/40">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-cinzel text-white text-lg font-bold">{title}</h3>
          <p className="font-cormorant text-white/50 text-sm mt-1">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          {typeof countValue === 'number' && countLabel && (
            <div className="text-right">
              <p className="font-cinzel text-[11px] tracking-widest uppercase text-gold/80">{countLabel}</p>
              <p className="font-cinzel text-2xl text-gold mt-1">{countValue}</p>
            </div>
          )}
          <button
            type="button"
            onClick={onToggle}
            className="px-4 py-2.5 border border-gold/25 rounded-lg text-white/70 hover:text-gold hover:border-gold/45 transition-all font-cormorant text-sm"
          >
            <span className="inline-flex items-center gap-2">
              {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              {collapsed ? 'Afficher' : 'Masquer'}
            </span>
          </button>
        </div>
      </div>

      {!collapsed && <div className="mt-5">{children}</div>}
    </section>
  );
}

export default function Admin() {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [pwError, setPwError] = useState(false);
  const [tab, setTab] = useState<AdminTab>('guests');
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    inserted: number;
    updated: number;
    failed: number;
    csvDuplicatesCollapsed: number;
    dryRun: boolean;
  } | null>(null);
  const [csvDryRun, setCsvDryRun] = useState(false);
  const [csvLineReport, setCsvLineReport] = useState<CsvLineReport[]>([]);
  const [newGuest, setNewGuest] = useState<NewGuest>(emptyGuest);
  const [addGuestMessage, setAddGuestMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPersonType, setFilterPersonType] = useState<PersonType | 'all'>('all');
  const [filterGender, setFilterGender] = useState<GenderFilter>('all');
  const [filterInvitationStatus, setFilterInvitationStatus] = useState<InvitationStatusFilter>('all');
  const [filterRsvpStatus, setFilterRsvpStatus] = useState<RSVPStatusFilter>('all');
  const [filterGuestsCount, setFilterGuestsCount] = useState<GuestsCountFilter>('all');
  const [contactEdits, setContactEdits] = useState<Record<string, { phone: string; email: string; is_couple?: boolean }>>({});
  const [savingContactId, setSavingContactId] = useState<string | null>(null);
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkRsvpFilter, setBulkRsvpFilter] = useState<BulkRsvpFilter>('all');
  const [bulkTypeFilter, setBulkTypeFilter] = useState<BulkTypeFilter>('all');
  const [bulkCoupleFilter, setBulkCoupleFilter] = useState<BulkCoupleFilter>('all');
  const [bulkDryRun, setBulkDryRun] = useState(false);
  const [bulkResult, setBulkResult] = useState<string | null>(null);
  const [bulkDetails, setBulkDetails] = useState<BulkGuestDetail[]>([]);
  const [bulkDiagLoading, setBulkDiagLoading] = useState(false);
  const [bulkDiagResult, setBulkDiagResult] = useState<string | null>(null);
  const [selectedGuestIds, setSelectedGuestIds] = useState<string[]>([]);
  const [invitationChannelCombo, setInvitationChannelCombo] = useState<InvitationChannelCombo>('sms_whatsapp_email');
  const [directInviteDryRun, setDirectInviteDryRun] = useState(false);
  const [directInviteSending, setDirectInviteSending] = useState(false);
  const [directInviteResult, setDirectInviteResult] = useState<string | null>(null);
  const [directInviteDetails, setDirectInviteDetails] = useState<DirectGuestDetail[]>([]);
  const [dispatchLogs, setDispatchLogs] = useState<DispatchLogRow[]>([]);
  const [sessionLogs, setSessionLogs] = useState<DispatchLogRow[]>([]);
  const [dispatchLogsLoading, setDispatchLogsLoading] = useState(false);
  const [dispatchLogsError, setDispatchLogsError] = useState<string | null>(null);
  const [dispatchLogsDeleting, setDispatchLogsDeleting] = useState(false);
  const [dispatchLogsActionMessage, setDispatchLogsActionMessage] = useState<string | null>(null);
  const [selectedDispatchLogIds, setSelectedDispatchLogIds] = useState<number[]>([]);
  const [dispatchLogChannelFilter, setDispatchLogChannelFilter] = useState<DispatchChannel | 'all'>('all');
  const [dispatchLogStatusFilter, setDispatchLogStatusFilter] = useState<DispatchStatus | 'all'>('all');
  const [dispatchLogSearchTerm, setDispatchLogSearchTerm] = useState('');
  const [adminQuickSearch, setAdminQuickSearch] = useState('');
  const [recentQuickSearches, setRecentQuickSearches] = useState<string[]>([]);
  const [guestQuickPreset, setGuestQuickPreset] = useState<'none' | 'missing_contact' | 'pending_rsvp'>('none');
  const [compactGuestTable, setCompactGuestTable] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<AdminSectionId, boolean>>({
    dashboard: false,
    journal: false,
    workspace: false,
    invitations: false,
  });
  const [whatsappDiagResult, setWhatsappDiagResult] = useState<string | null>(null);
  const [whatsappDiagLoading, setWhatsappDiagLoading] = useState(false);
  const guestsTable = () => supabase.from('guests');

  const isMissingContactPresetActive = tab === 'guests' && guestQuickPreset === 'missing_contact';
  const isPendingRsvpPresetActive = tab === 'guests' && guestQuickPreset === 'pending_rsvp';
  const isFailedLogsShortcutActive = dispatchLogStatusFilter === 'failed';
  const channelHasSms = invitationChannelCombo.includes('sms');
  const channelHasWhatsapp = invitationChannelCombo.includes('whatsapp');
  const channelHasEmail = invitationChannelCombo.includes('email');

  const toggleSection = (section: AdminSectionId) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const expandAndScrollTo = (section: AdminSectionId) => {
    const sectionId = `admin-${section}`;
    setCollapsedSections((prev) => ({
      ...prev,
      [section]: false,
    }));

    const scrollWithOffset = () => {
      const target = document.getElementById(sectionId);
      if (!target) return;

      const navHeight = document.querySelector('nav')?.getBoundingClientRect().height ?? 0;
      const top = window.scrollY + target.getBoundingClientRect().top - navHeight - 16;
      window.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });
    };

    // Retry once after layout settles to avoid slight misses when sections expand.
    window.requestAnimationFrame(() => {
      scrollWithOffset();
      window.setTimeout(scrollWithOffset, 180);
    });

    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${sectionId}`);
    }
  };

  const loadGuests = useCallback(async () => {
    setLoading(true);
    const { data } = await guestsTable().select('*').order('created_at', { ascending: false });
    setGuests(data || []);
    setLoading(false);
  }, []);

  const resetCsvImportFeedback = useCallback(() => {
    setUploadResult(null);
    setCsvLineReport([]);
  }, []);

  const loadDispatchLogs = useCallback(async () => {
    setDispatchLogsLoading(true);
    setDispatchLogsError(null);

    const { data, error } = await supabase
      .from('message_dispatch_logs')
      .select('id, created_at, source_function, event_type, channel, recipient_type, guest_name, target, status, error_message, dry_run, provider, provider_message_id, provider_status, provider_status_detail, provider_updated_at, delivered_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      setDispatchLogsError(userError('Impossible de charger l\'historique des envois.', error.message));
      setDispatchLogsLoading(false);
      return false;
    }

    const rows = (data as DispatchLogRow[]) ?? [];
    const persistedStatusKeys = new Set(
      rows.map((row) => `${dispatchLogIdentityKey(row)}||${row.status}`)
    );

    setDispatchLogs(rows);
    setSessionLogs((prev) =>
      prev.filter((row) => !persistedStatusKeys.has(`${dispatchLogIdentityKey(row)}||${row.status}`))
    );
    setDispatchLogsLoading(false);
    return true;
  }, []);

  const appendSessionDispatchLogs = useCallback((entries: NewDispatchLogRow[]) => {
    if (entries.length === 0) return;

    setSessionLogs((prev) => {
      const minExistingId = prev.reduce((minId, item) => Math.min(minId, item.id), 0);
      let nextId = minExistingId <= -1 ? minExistingId - 1 : -1;

      const stamped = entries.map((entry) => {
        const row: DispatchLogRow = {
          id: nextId,
          created_at: new Date().toISOString(),
          source_function: entry.source_function,
          event_type: entry.event_type,
          channel: entry.channel,
          recipient_type: entry.recipient_type,
          guest_name: entry.guest_name,
          target: entry.target,
          status: entry.status,
          error_message: entry.error_message,
          dry_run: entry.dry_run,
          provider: entry.provider,
          provider_message_id: entry.provider_message_id ?? null,
          provider_status: entry.provider_status ?? null,
          provider_status_detail: entry.provider_status_detail ?? null,
          provider_updated_at: entry.provider_updated_at ?? null,
          delivered_at: entry.delivered_at ?? null,
        };
        nextId -= 1;
        return row;
      });

      return [...stamped, ...prev].slice(0, 500);
    });
  }, []);

  const runWhatsAppDiagnostics = async () => {
    if (whatsappDiagLoading) return;

    setWhatsappDiagLoading(true);
    setWhatsappDiagResult(null);

    try {
      if (!supabaseUrl || !supabaseAnonKey) {
        setWhatsappDiagResult(userError('La configuration SMS est incomplète sur ce site.'));
        setWhatsappDiagLoading(false);
        return;
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/notify-invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          channels: {
            sms: false,
            email: false,
            whatsapp: true,
          },
          dry_run: true,
          mark_sent: false,
          guests: [
            {
              id: '00000000-0000-4000-8000-000000000001',
              first_name: 'Diagnostic',
              last_name: 'WhatsApp',
              post_name: '',
              phone: '+243000000000',
              rsvp_contact_phone: '+243000000000',
              rsvp_contact_email: 'diag-whatsapp@example.com',
            },
          ],
        }),
      });

      const raw = await response.text();
      let parsed: unknown = null;

      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = null;
      }

      if (!response.ok) {
        const missingSecrets = (parsed as { missing_secrets?: string[] } | null)?.missing_secrets ?? [];
        if (response.status === 503 && missingSecrets.length > 0) {
          setWhatsappDiagResult(userError(`Le SMS n'est pas encore prêt. Il manque des informations de connexion Afrikatalk.`));
        } else {
          const errorMessage = (parsed as { error?: string } | null)?.error ?? raw ?? `HTTP ${response.status}`;
          setWhatsappDiagResult(userError('Le test SMS a échoué.', errorMessage));
        }
        setWhatsappDiagLoading(false);
        return;
      }

      const summary = (parsed as {
        summary?: {
          sms?: { eligible: number; sent: number; failed: number };
          whatsapp?: { eligible: number; sent: number; failed: number };
          errors?: string[];
        };
      } | null)?.summary;

      const smsSummary = summary?.whatsapp ?? summary?.sms;
      const summaryErrors = summary?.errors ?? [];

      if (!summary || !smsSummary) {
        setWhatsappDiagResult(userError('Le test SMS a répondu, mais les informations reçues sont incomplètes.'));
        setWhatsappDiagLoading(false);
        return;
      }

      if (summaryErrors.length > 0) {
        const technical = summaryErrors.slice(0, 2).join(' | ');
        setWhatsappDiagResult(userError('Le diagnostic indique que le canal SMS n\'est pas prêt.', technical));
        setWhatsappDiagLoading(false);
        return;
      }

      if (smsSummary.eligible === 0) {
        setWhatsappDiagResult(userError('Aucun numéro valide n\'a été trouvé pour le test SMS.'));
        setWhatsappDiagLoading(false);
        return;
      }

      setWhatsappDiagResult(
        `Diagnostic OK (simulation): ${smsSummary.eligible} contact(s) éligible(s), ${smsSummary.sent} envoyé(s), ${smsSummary.failed} en échec. Aucun SMS réel n'est envoyé pendant ce test.`
      );
      setWhatsappDiagLoading(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setWhatsappDiagResult(userError('Impossible de terminer le test SMS.', message));
      setWhatsappDiagLoading(false);
    }
  };

  useEffect(() => {
    if (!unlocked) return;
    void loadGuests();
    void loadDispatchLogs();
  }, [unlocked, loadGuests, loadDispatchLogs]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const savedCollapsed = window.localStorage.getItem(ADMIN_COLLAPSED_SECTIONS_KEY);
      if (savedCollapsed) {
        const parsed = JSON.parse(savedCollapsed) as Partial<Record<AdminSectionId, boolean>>;
        setCollapsedSections((prev) => ({
          ...prev,
          ...parsed,
        }));
      }

      const savedTab = window.localStorage.getItem(ADMIN_ACTIVE_TAB_KEY);
      if (savedTab === 'guests' || savedTab === 'upload') {
        setTab(savedTab);
      }

      const savedCompact = window.localStorage.getItem(ADMIN_COMPACT_TABLE_KEY);
      if (savedCompact === '1') {
        setCompactGuestTable(true);
      }

      const savedHistory = window.localStorage.getItem(ADMIN_QUICK_SEARCH_HISTORY_KEY);
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory) as unknown;
        if (Array.isArray(parsed)) {
          const normalized = parsed
            .filter((value): value is string => typeof value === 'string')
            .map((value) => value.trim())
            .filter((value) => value.length > 0)
            .slice(0, 5);
          setRecentQuickSearches(normalized);
        }
      }

      const savedSessionLogs = window.localStorage.getItem(ADMIN_SESSION_LOGS_KEY);
      if (savedSessionLogs) {
        const parsed = JSON.parse(savedSessionLogs) as unknown;
        if (Array.isArray(parsed)) {
          const normalized = parsed
            .filter((value): value is Record<string, unknown> => typeof value === 'object' && value !== null)
            .map((value): DispatchLogRow | null => {
              const id = typeof value.id === 'number' ? value.id : null;
              const createdAt = typeof value.created_at === 'string' ? value.created_at : null;
              const sourceFunction = typeof value.source_function === 'string' ? value.source_function : null;
              const eventType = typeof value.event_type === 'string' ? value.event_type : null;
              const channel = value.channel;
              const recipientType = value.recipient_type;
              const status = value.status;
              const dryRun = typeof value.dry_run === 'boolean' ? value.dry_run : false;

              if (
                id === null ||
                createdAt === null ||
                sourceFunction === null ||
                eventType === null ||
                (channel !== 'email' && channel !== 'sms' && channel !== 'whatsapp') ||
                (recipientType !== 'guest' && recipientType !== 'host' && recipientType !== 'admin' && recipientType !== 'unknown') ||
                (status !== 'eligible' && status !== 'sent' && status !== 'delivered' && status !== 'failed' && status !== 'skipped')
              ) {
                return null;
              }

              return {
                id,
                created_at: createdAt,
                source_function: sourceFunction,
                event_type: eventType,
                channel,
                recipient_type: recipientType,
                guest_name: typeof value.guest_name === 'string' ? value.guest_name : null,
                target: typeof value.target === 'string' ? value.target : null,
                status,
                error_message: typeof value.error_message === 'string' ? value.error_message : null,
                dry_run: dryRun,
                provider: typeof value.provider === 'string' ? value.provider : null,
                provider_message_id: typeof value.provider_message_id === 'string' ? value.provider_message_id : null,
                provider_status: typeof value.provider_status === 'string' ? value.provider_status : null,
                provider_status_detail: typeof value.provider_status_detail === 'string' ? value.provider_status_detail : null,
                provider_updated_at: typeof value.provider_updated_at === 'string' ? value.provider_updated_at : null,
                delivered_at: typeof value.delivered_at === 'string' ? value.delivered_at : null,
              };
            })
            .filter((value): value is DispatchLogRow => value !== null)
            .slice(0, 500);
          setSessionLogs(normalized);
        }
      }
    } catch {
      // Ignore storage parsing failures and continue with defaults.
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ADMIN_COLLAPSED_SECTIONS_KEY, JSON.stringify(collapsedSections));
  }, [collapsedSections]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ADMIN_ACTIVE_TAB_KEY, tab);
  }, [tab]);

  useEffect(() => {
    if (tab === 'upload') return;
    resetCsvImportFeedback();
  }, [tab, resetCsvImportFeedback]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ADMIN_COMPACT_TABLE_KEY, compactGuestTable ? '1' : '0');
  }, [compactGuestTable]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ADMIN_QUICK_SEARCH_HISTORY_KEY, JSON.stringify(recentQuickSearches.slice(0, 5)));
  }, [recentQuickSearches]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ADMIN_SESSION_LOGS_KEY, JSON.stringify(sessionLogs.slice(0, 500)));
  }, [sessionLogs]);

  useEffect(() => {
    setSelectedGuestIds((prev) => {
      const validIds = new Set(guests.map((guest) => guest.id));
      return prev.filter((id) => validIds.has(id));
    });
  }, [guests]);

  useEffect(() => {
    setSelectedDispatchLogIds((prev) => {
      const activeLogs = [...sessionLogs, ...dispatchLogs];
      const validIds = new Set(activeLogs.map((log) => log.id));
      return prev.filter((id) => validIds.has(id));
    });
  }, [dispatchLogs, sessionLogs]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setUnlocked(true);
      setPwError(false);
    } else {
      setPwError(true);
    }
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      resetCsvImportFeedback();

      const text = evt.target?.result;
      if (typeof text !== 'string') {
        setUploadResult({ inserted: 0, updated: 0, failed: 1, csvDuplicatesCollapsed: 0, dryRun: csvDryRun });
        setCsvLineReport([
          {
            line: 1,
            fullName: 'Fichier CSV',
            action: 'ignored',
            reason: 'Lecture impossible du fichier CSV. Vérifiez son encodage UTF-8.',
          },
        ]);
        return;
      }

      const normalizedText = stripUtf8Bom(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const lines = normalizedText
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (lines.length === 0) {
        setUploadResult({ inserted: 0, updated: 0, failed: 1, csvDuplicatesCollapsed: 0, dryRun: csvDryRun });
        setCsvLineReport([
          {
            line: 1,
            fullName: 'Fichier CSV',
            action: 'ignored',
            reason: 'Le fichier est vide.',
          },
        ]);
        return;
      }

      const delimiter = detectCsvDelimiter(lines);
      const header = splitCsvLine(lines[0], delimiter).map((h) => normalizeCsvHeader(h));

      const getIdx = (names: string[]) => names.reduce((acc, n) => (acc === -1 ? header.indexOf(n) : acc), -1);
      const fnIdx = getIdx(['first name', 'firstname', 'prenom']);
      const lnIdx = getIdx(['last name', 'lastname', 'nom', 'family name']);
      const pnIdx = getIdx(['post name', 'postname', 'postnom', 'middle name']);
      const typeIdx = getIdx(['type', 'person type', 'type personne']);
      const genderIdx = getIdx(['gender', 'sex', 'sexe']);
      const phoneIdx = getIdx(['phone', 'telephone', 'numero', 'contact phone']);
      const emailIdx = getIdx(['email', 'mail', 'contact email', 'rsvp contact email']);
      // Colonne couple (optionnelle)
      const isCoupleIdx = getIdx(['is couple', 'is_couple', 'iscouple', 'couple']);

      if (fnIdx === -1 || lnIdx === -1 || genderIdx === -1) {
        setUploadResult({
          inserted: 0,
          updated: 0,
          failed: Math.max(lines.length - 1, 1),
          csvDuplicatesCollapsed: 0,
          dryRun: csvDryRun,
        });
        setCsvLineReport([
          {
            line: 1,
            fullName: 'En-tête CSV',
            action: 'ignored',
            reason: 'Colonnes obligatoires manquantes: first_name/prenom, last_name/nom, gender/sexe.',
          },
        ]);
        return;
      }

      let inserted = 0;
      let updated = 0;
      let failed = 0;
      let csvDuplicatesCollapsed = 0;
      const lineReports: CsvLineReport[] = [];

      const existingByName = new Map(guests.map((guest) => [guestNameKey(guest.first_name, guest.last_name), guest]));
      const stagedRows = new Map<
        string,
        {
          first_name: string;
          last_name: string;
          post_name: string;
          person_type?: PersonType;
          gender: Guest['gender'];
          phone: string;
          rsvp_contact_email: string;
          is_couple: boolean;
          line: number;
          fullName: string;
          reportIndex: number;
        }
      >();

      for (let i = 1; i < lines.length; i++) {
        const cols = splitCsvLine(lines[i], delimiter).map((c) => c.trim());
        const first_name = (fnIdx >= 0 ? cols[fnIdx] : '').trim();
        const last_name = (lnIdx >= 0 ? cols[lnIdx] : '').trim();
        const fullName = `${first_name} ${last_name}`.trim() || `Ligne ${i + 1}`;
        const post_name = (pnIdx >= 0 ? cols[pnIdx] || '' : '').trim();
        const rawGender = (genderIdx >= 0 ? cols[genderIdx] : '').trim().toLowerCase();
        const gender = rawGender === 'female' || rawGender === 'femme' || rawGender === 'f'
          ? 'female'
          : rawGender === 'male' || rawGender === 'homme' || rawGender === 'm'
            ? 'male'
            : '';

        if (!first_name || !last_name || !gender) {
          failed++;
          lineReports.push({
            line: i + 1,
            fullName,
            action: 'ignored',
            reason: 'Ligne invalide: first_name, last_name et gender sont obligatoires.',
          });
          continue;
        }

        const rawType = (typeIdx >= 0 ? cols[typeIdx] : '').trim();
        const person_type = rawType ? normalizePersonType(rawType) : undefined;
        const rowNameKey = guestNameKey(first_name, last_name);
        const lineReport: CsvLineReport = {
          line: i + 1,
          fullName,
          action: 'ignored',
          reason: 'Analyse en cours',
        };
        lineReports.push(lineReport);
        const currentReportIndex = lineReports.length - 1;

        if (stagedRows.has(rowNameKey)) {
          csvDuplicatesCollapsed++;
          const previous = stagedRows.get(rowNameKey);
          if (previous) {
            lineReports[previous.reportIndex] = {
              ...lineReports[previous.reportIndex],
              action: 'ignored',
              reason: `Doublon trouvé: ${fullName} (remplacé par la ligne ${i + 1}).`,
            };
          }
        }

        // Champs couple
        const rawIsCouple = (isCoupleIdx >= 0 ? cols[isCoupleIdx] || '' : '').trim().toLowerCase();
        const is_couple = rawIsCouple === '1' || rawIsCouple === 'true' || rawIsCouple === 'oui' || rawIsCouple === 'yes';
        stagedRows.set(rowNameKey, {
          first_name,
          last_name,
          post_name,
          person_type,
          gender,
          phone: (phoneIdx >= 0 ? cols[phoneIdx] || '' : '').trim(),
          rsvp_contact_email: (emailIdx >= 0 ? cols[emailIdx] || '' : '').trim(),
          is_couple,
          line: i + 1,
          fullName,
          reportIndex: currentReportIndex,
        });
      }

      for (const [rowNameKey, row] of stagedRows.entries()) {
        const existing = existingByName.get(rowNameKey);

        if (existing) {
          lineReports[row.reportIndex] = {
            ...lineReports[row.reportIndex],
            action: 'ignored',
            reason: `Ignoré: ${row.first_name} ${row.last_name} existe déjà dans la base de données.`,
          };
          csvDuplicatesCollapsed++;
          continue;
        }

        if (csvDryRun) {
          inserted++;
          lineReports[row.reportIndex] = {
            ...lineReports[row.reportIndex],
            action: 'added',
            reason: `Nouvel invité: ${row.first_name} ${row.last_name} (ajout prévu, prévisualisation).`,
          };
          continue;
        }

        const { error } = await guestsTable().insert({
          first_name: row.first_name,
          last_name: row.last_name,
          post_name: row.post_name,
          person_type: row.person_type ?? 'family',
          gender: row.gender,
          phone: row.phone,
          rsvp_contact_phone: row.phone,
          rsvp_contact_email: row.rsvp_contact_email,
          is_couple: row.is_couple ?? false,
          partner_first_name: '',
          partner_post_name: '',
          partner_last_name: '',
          partner_phone: '',
          partner_gender: 'female',
        });

        if (error) {
          failed++;
          lineReports[row.reportIndex] = {
            ...lineReports[row.reportIndex],
            action: 'ignored',
            reason: `Échec ajout ${row.first_name} ${row.last_name}: ${error.message}`,
          };
        } else {
          inserted++;
          lineReports[row.reportIndex] = {
            ...lineReports[row.reportIndex],
            action: 'added',
            reason: `Ajouté: ${row.first_name} ${row.last_name}.`,
          };
        }
      }

      lineReports.sort((a, b) => a.line - b.line);
      setCsvLineReport(lineReports);
      setUploadResult({ inserted, updated, failed, csvDuplicatesCollapsed, dryRun: csvDryRun });

      if (!csvDryRun) {
        await loadGuests();
        if (inserted + updated > 0) {
          setTab('guests');
        }
      }
    };
    reader.onerror = () => {
      setUploadResult({ inserted: 0, updated: 0, failed: 1, csvDuplicatesCollapsed: 0, dryRun: csvDryRun });
      setCsvLineReport([
        {
          line: 1,
          fullName: file.name,
          action: 'ignored',
          reason: 'Erreur de lecture du fichier. Réessayez avec un CSV UTF-8.',
        },
      ]);
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  const updateRSVP = async (id: string, rsvp_status: Guest['rsvp_status']) => {
    await guestsTable().update({ rsvp_status }).eq('id', id);
    setGuests((prev) => prev.map((g) => (g.id === id ? { ...g, rsvp_status } : g)));
  };

  const deleteGuest = async (id: string) => {
    if (!confirm('Supprimer cet invite ?')) return;
    await guestsTable().delete().eq('id', id);
    setGuests((prev) => prev.filter((g) => g.id !== id));
  };

  const updateGuestContact = async (guest: Guest) => {
    const current = contactEdits[guest.id] ?? {
      phone: guest.phone || guest.rsvp_contact_phone || '',
      email: guest.rsvp_contact_email || '',
      is_couple: guest.is_couple,
    };

    setSavingContactId(guest.id);
    const phone = current.phone.trim();
    const email = current.email.trim();
    const is_couple = current.is_couple ?? guest.is_couple;

    const { error } = await guestsTable()
      .update({
        phone,
        rsvp_contact_phone: phone,
        rsvp_contact_email: email,
        is_couple,
      })
      .eq('id', guest.id);

    if (!error) {
      setGuests((prev) =>
        prev.map((g) =>
          g.id === guest.id
            ? {
                ...g,
                phone,
                rsvp_contact_phone: phone,
                rsvp_contact_email: email,
                is_couple,
              }
            : g
        )
      );
      setContactEdits((prev) => {
        const next = { ...prev };
        delete next[guest.id];
        return next;
      });
    }

    setSavingContactId(null);
  };

  const exportCSV = () => {
    const header = 'first_name,post_name,last_name,person_type,gender,phone,email,invitation_status,rsvp_status,number_of_guests,download_count,is_couple';
    const rows = filteredGuests.map(
      (g) =>
        [
          g.first_name,
          g.post_name,
          g.last_name,
          normalizePersonType(g.person_type, g.group_name),
          g.gender,
          g.phone || '',
          g.rsvp_contact_email || '',
          g.invitation_status,
          g.rsvp_status,
          g.number_of_guests,
          g.download_count ?? 0,
          g.is_couple ? '1' : '0',
        ]
          .map(escapeCsvCell)
          .join(',')
    );
    const csv = ['\uFEFF' + header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wedding_guests.csv';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredGuests = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return [...guests]
      .filter((guest) => {
        const guestType = normalizePersonType(guest.person_type, guest.group_name);
        const matchesSearch =
          !normalizedSearch ||
          [
            guest.first_name,
            guest.last_name,
            guest.post_name,
            guestType,
            guest.gender,
            guest.phone,
            guest.rsvp_contact_email,
          ]
            .join(' ')
            .toLowerCase()
            .includes(normalizedSearch);

        const matchesPersonType =
          filterPersonType === 'all' || guestType === filterPersonType;

        const matchesGender =
          filterGender === 'all' || guest.gender === filterGender;

        const matchesInvitationStatus =
          filterInvitationStatus === 'all' || guest.invitation_status === filterInvitationStatus;

        const matchesRsvpStatus =
          filterRsvpStatus === 'all' || guest.rsvp_status === filterRsvpStatus;

        const matchesGuestsCount =
          filterGuestsCount === 'all' ||
          (filterGuestsCount === 'solo' && guest.number_of_guests === 1) ||
          (filterGuestsCount === 'pair' && guest.number_of_guests === 2) ||
          (filterGuestsCount === 'group' && guest.number_of_guests >= 3) ||
          (filterGuestsCount === 'couple' && guest.is_couple);

        const hasPhone = Boolean((guest.phone || guest.rsvp_contact_phone || '').trim());
        const hasEmail = Boolean((guest.rsvp_contact_email || '').trim());
        const matchesQuickPreset =
          guestQuickPreset === 'none' ||
          (guestQuickPreset === 'missing_contact' && (!hasPhone || !hasEmail)) ||
          (guestQuickPreset === 'pending_rsvp' && guest.rsvp_status === 'pending');

        return (
          matchesSearch &&
          matchesPersonType &&
          matchesGender &&
          matchesInvitationStatus &&
          matchesRsvpStatus &&
          matchesGuestsCount &&
          matchesQuickPreset
        );
      })
      .sort((left, right) => {
        const leftFullName = `${left.first_name} ${left.post_name} ${left.last_name}`.trim();
        const rightFullName = `${right.first_name} ${right.post_name} ${right.last_name}`.trim();
        return leftFullName.localeCompare(rightFullName, 'fr', { sensitivity: 'base' });
      });
  }, [guests, searchTerm, filterPersonType, filterGender, filterInvitationStatus, filterRsvpStatus, filterGuestsCount, guestQuickPreset]);

  const peopleCountForGuest = useCallback((guest: Guest) => {
    const minimum = guest.is_couple ? 2 : 1;
    const raw = Number.isFinite(guest.number_of_guests) ? Math.trunc(guest.number_of_guests) : minimum;
    return Math.max(minimum, raw);
  }, []);

  const filteredStats = useMemo(
    () => ({
      total: filteredGuests.length,
      people: filteredGuests.reduce((sum, guest) => sum + peopleCountForGuest(guest), 0),
      family: filteredGuests.filter((guest) => normalizePersonType(guest.person_type, guest.group_name) === 'family').length,
      friends: filteredGuests.filter((guest) => normalizePersonType(guest.person_type, guest.group_name) === 'friends').length,
      work: filteredGuests.filter((guest) => normalizePersonType(guest.person_type, guest.group_name) === 'work').length,
      couples: filteredGuests.filter((guest) => guest.is_couple).length,
    }),
    [filteredGuests, peopleCountForGuest]
  );

  const selectedGuestsForDirectInvite = useMemo(
    () => guests.filter((guest) => selectedGuestIds.includes(guest.id)),
    [guests, selectedGuestIds]
  );

  const allDispatchLogs = useMemo(
    () => [...sessionLogs, ...dispatchLogs],
    [dispatchLogs, sessionLogs]
  );

  const finalStateDispatchLogs = useMemo(() => {
    const keysWithFinalStatus = new Set(
      allDispatchLogs
        .filter((item) => item.status !== 'eligible')
        .map((item) => dispatchLogIdentityKey(item))
    );

    const withoutEligible = allDispatchLogs.filter((item) => {
      if (item.status !== 'eligible') return true;
      return !keysWithFinalStatus.has(dispatchLogIdentityKey(item));
    });

    // Keep only the latest row for each identity+status to avoid noisy duplicates.
    const sorted = [...withoutEligible].sort((a, b) => {
      const ta = Number.isNaN(Date.parse(a.created_at)) ? 0 : Date.parse(a.created_at);
      const tb = Number.isNaN(Date.parse(b.created_at)) ? 0 : Date.parse(b.created_at);
      return tb - ta;
    });

    const seenStatusKeys = new Set<string>();
    const dedupedRows: DispatchLogRow[] = [];

    for (const item of sorted) {
      const statusKey = `${dispatchLogIdentityKey(item)}||${item.status}`;
      if (seenStatusKeys.has(statusKey)) continue;
      seenStatusKeys.add(statusKey);
      dedupedRows.push(item);
    }

    return dedupedRows;
  }, [allDispatchLogs]);

  const filteredDispatchLogs = useMemo(() => {
    const query = dispatchLogSearchTerm.trim().toLowerCase();

    return finalStateDispatchLogs.filter((item) => {
      const channelMatches = dispatchLogChannelFilter === 'all' || item.channel === dispatchLogChannelFilter;
      const statusMatches = dispatchLogStatusFilter === 'all' || item.status === dispatchLogStatusFilter;

      if (!channelMatches || !statusMatches) return false;
      if (!query) return true;

      const haystack = [
        item.source_function,
        item.event_type,
        item.guest_name ?? '',
        item.target ?? '',
        item.error_message ?? '',
        item.provider_status ?? '',
        item.provider_status_detail ?? '',
        item.provider_message_id ?? '',
        item.channel,
        item.status,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [finalStateDispatchLogs, dispatchLogChannelFilter, dispatchLogStatusFilter, dispatchLogSearchTerm]);

  const adminQuickSearchPreview = useMemo(() => {
    const query = adminQuickSearch.trim();
    if (!query) {
      return { label: 'Prêt', count: 0 };
    }

    const normalized = query
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    const matchesAny = (...keywords: string[]) => keywords.some((keyword) => normalized.includes(keyword));

    if (matchesAny('journal', 'log', 'historique')) {
      const inLogs = allDispatchLogs.filter((item) => {
        const haystack = [
          item.source_function,
          item.event_type,
          item.guest_name ?? '',
          item.target ?? '',
          item.error_message ?? '',
          item.channel,
          item.status,
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(query.toLowerCase());
      }).length;

      return { label: 'Logs trouvés', count: inLogs };
    }

    if (matchesAny('bulk', 'global', 'masse', 'campagne', 'sms', 'email', 'whatsapp')) {
      return { label: 'Invités ciblables', count: guests.length };
    }

    if (matchesAny('import', 'csv', 'ajout manuel', 'ajouter', 'nouvel')) {
      return { label: 'Actions disponibles', count: 2 };
    }

    const guestMatches = guests.filter((guest) =>
      [
        guest.first_name,
        guest.last_name,
        guest.post_name,
        guest.phone,
        guest.rsvp_contact_email,
        normalizePersonType(guest.person_type, guest.group_name),
        guest.rsvp_status,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query.toLowerCase())
    ).length;

    return { label: 'Invités trouvés', count: guestMatches };
  }, [adminQuickSearch, allDispatchLogs, guests]);

  const allDispatchLogsSelected =
    filteredDispatchLogs.length > 0 && filteredDispatchLogs.every((item) => selectedDispatchLogIds.includes(item.id));

  const allFilteredGuestsSelected =
    filteredGuests.length > 0 && filteredGuests.every((guest) => selectedGuestIds.includes(guest.id));

  const toggleGuestSelection = (guestId: string, checked: boolean) => {
    setSelectedGuestIds((prev) => {
      if (checked) {
        if (prev.includes(guestId)) return prev;
        return [...prev, guestId];
      }

      return prev.filter((id) => id !== guestId);
    });
  };

  const toggleSelectAllFilteredGuests = (checked: boolean) => {
    setSelectedGuestIds((prev) => {
      const filteredIds = filteredGuests.map((guest) => guest.id);

      if (checked) {
        return Array.from(new Set([...prev, ...filteredIds]));
      }

      const filteredSet = new Set(filteredIds);
      return prev.filter((id) => !filteredSet.has(id));
    });
  };

  const clearSelectedGuests = () => {
    setSelectedGuestIds([]);
  };

  const toggleDispatchLogSelection = (logId: number, checked: boolean) => {
    setSelectedDispatchLogIds((prev) => {
      if (checked) {
        if (prev.includes(logId)) return prev;
        return [...prev, logId];
      }

      return prev.filter((id) => id !== logId);
    });
  };

  const toggleSelectAllDispatchLogs = (checked: boolean) => {
    const visibleIds = filteredDispatchLogs.map((item) => item.id);

    if (checked) {
      setSelectedDispatchLogIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
      return;
    }

    const visibleSet = new Set(visibleIds);
    setSelectedDispatchLogIds((prev) => prev.filter((id) => !visibleSet.has(id)));
  };

  const resetDispatchLogFilters = () => {
    setDispatchLogChannelFilter('all');
    setDispatchLogStatusFilter('all');
    setDispatchLogSearchTerm('');
  };

  const deleteSelectedDispatchLogs = async () => {
    if (dispatchLogsDeleting || selectedDispatchLogIds.length === 0) return;

    const confirmed = confirm(`Supprimer ${selectedDispatchLogIds.length} ligne(s) du journal ?`);
    if (!confirmed) return;

    setDispatchLogsDeleting(true);
    setDispatchLogsActionMessage(null);

    const dbIds = selectedDispatchLogIds.filter((id) => id > 0);
    const sessionIds = selectedDispatchLogIds.filter((id) => id <= 0);

    if (sessionIds.length > 0) {
      const sessionSet = new Set(sessionIds);
      setSessionLogs((prev) => prev.filter((log) => !sessionSet.has(log.id)));
    }

    let dbError: string | null = null;
    if (dbIds.length > 0) {
      const { error } = await supabase.from('message_dispatch_logs').delete().in('id', dbIds);
      if (error) {
        dbError = error.message;
      } else {
        await loadDispatchLogs();
      }
    }

    setSelectedDispatchLogIds([]);

    if (dbError) {
      setDispatchLogsActionMessage(userError('La suppression de la sélection a échoué.', dbError));
    } else {
      setDispatchLogsActionMessage(`Succès: ${selectedDispatchLogIds.length} ligne(s) ont été supprimée(s) du journal.`);
    }

    setDispatchLogsDeleting(false);
  };

  const deleteAllDispatchLogs = async () => {
    if (dispatchLogsDeleting || allDispatchLogs.length === 0) return;

    const confirmed = confirm('Supprimer TOUT le journal des envois ? Cette action est irreversible.');
    if (!confirmed) return;

    setDispatchLogsDeleting(true);
    setDispatchLogsActionMessage(null);

    const hasDatabaseLogs = dispatchLogs.length > 0;
    let dbError: string | null = null;

    if (hasDatabaseLogs) {
      const { error } = await supabase.from('message_dispatch_logs').delete().gt('id', 0);
      if (error) {
        dbError = error.message;
      } else {
        await loadDispatchLogs();
      }
    }

    setSessionLogs([]);
    setSelectedDispatchLogIds([]);

    if (dbError) {
      setDispatchLogsActionMessage(userError('La suppression complète du journal a échoué.', dbError));
    } else {
      setDispatchLogsActionMessage('Succès: tout le journal a été supprimé.');
    }

    setDispatchLogsDeleting(false);
  };

  const resetGuestFilters = () => {
    setSearchTerm('');
    setFilterPersonType('all');
    setFilterGender('all');
    setFilterInvitationStatus('all');
    setFilterRsvpStatus('all');
    setFilterGuestsCount('all');
    setGuestQuickPreset('none');
  };

  const exportFilteredAdminView = () => {
    const payload = {
      generated_at: new Date().toISOString(),
      tab,
      quick_search: adminQuickSearch,
      quick_preset: guestQuickPreset,
      guest_filters: {
        searchTerm,
        person_type: filterPersonType,
        gender: filterGender,
        invitation_status: filterInvitationStatus,
        rsvp_status: filterRsvpStatus,
        guests_count: filterGuestsCount,
      },
      dispatch_log_filters: {
        channel: dispatchLogChannelFilter,
        status: dispatchLogStatusFilter,
        search: dispatchLogSearchTerm,
      },
      counts: {
        guests_visible: filteredGuests.length,
        logs_visible: filteredDispatchLogs.length,
      },
      guests: filteredGuests,
      dispatch_logs: filteredDispatchLogs,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.href = url;
    a.download = `admin_filtered_view_${stamp}.json`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const scrollToGuestsTable = () => {
    const target = document.getElementById('admin-guests-table');
    if (!target) return;

    const navHeight = document.querySelector('nav')?.getBoundingClientRect().height ?? 0;
    const top = window.scrollY + target.getBoundingClientRect().top - navHeight - 16;
    window.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });
  };

  const applyGuestQuickPreset = (preset: 'missing_contact' | 'pending_rsvp') => {
    setTab('guests');
    setGuestQuickPreset(preset);
    if (preset === 'pending_rsvp') {
      setFilterRsvpStatus('pending');
    }
    if (preset === 'missing_contact') {
      setFilterRsvpStatus('all');
    }
    // Scroll directement vers la table des invités après application du filtre
    setTimeout(() => scrollToGuestsTable(), 200);
  };

  const applyFailedLogsShortcut = () => {
    setDispatchLogStatusFilter('failed');
    expandAndScrollTo('journal');
  };

  const resetAdminLayout = () => {
    setCollapsedSections({
      dashboard: false,
      journal: false,
      workspace: false,
      invitations: false,
    });
    setTab('guests');
    setCompactGuestTable(false);
    setAdminQuickSearch('');
    setRecentQuickSearches([]);
    setGuestQuickPreset('none');
    setDispatchLogChannelFilter('all');
    setDispatchLogStatusFilter('all');
    setDispatchLogSearchTerm('');
    resetGuestFilters();

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(ADMIN_COLLAPSED_SECTIONS_KEY);
      window.localStorage.removeItem(ADMIN_ACTIVE_TAB_KEY);
      window.localStorage.removeItem(ADMIN_COMPACT_TABLE_KEY);
      window.localStorage.removeItem(ADMIN_QUICK_SEARCH_HISTORY_KEY);
      window.localStorage.removeItem(ADMIN_SESSION_LOGS_KEY);
    }
  };

  const executeAdminQuickSearch = (rawQuery: string) => {
    const query = rawQuery.trim();
    if (!query) return;

    setRecentQuickSearches((prev) => {
      const deduped = [query, ...prev.filter((entry) => entry.toLowerCase() !== query.toLowerCase())];
      return deduped.slice(0, 5);
    });

    const normalized = query
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    const matchesAny = (...keywords: string[]) => keywords.some((keyword) => normalized.includes(keyword));

    if (matchesAny('journal', 'log', 'historique')) {
      setDispatchLogSearchTerm(query);
      expandAndScrollTo('journal');
      return;
    }

    if (matchesAny('bulk', 'global', 'masse', 'campagne', 'sms', 'email', 'whatsapp')) {
      setTab('guests');
      expandAndScrollTo('workspace');
      return;
    }

    if (matchesAny('import', 'csv', 'ajout manuel', 'ajouter', 'nouvel')) {
      setTab('upload');
      expandAndScrollTo('workspace');
      return;
    }

    setTab('guests');
    setSearchTerm(query);
    expandAndScrollTo('workspace');
  };

  const runAdminQuickSearch = () => {
    executeAdminQuickSearch(adminQuickSearch);
  };

  const invokeEdgeFunction = useCallback(
    async (functionName: 'notify-invitations' | 'notify-all-guests', requestBody: Record<string, unknown>) => {
      let data: unknown = null;
      let invokeError: { message?: string; context?: unknown } | null = null;

      const invokeResponse = await supabase.functions.invoke(functionName, {
        body: requestBody,
      });

      data = invokeResponse.data;
      invokeError = invokeResponse.error as { message?: string; context?: unknown } | null;

      if (invokeError && (invokeError.message ?? '').toLowerCase().includes('failed to send a request')) {
        if (!supabaseUrl || !supabaseAnonKey) {
          throw new Error('Configuration Supabase incomplète.');
        }

        const fallbackRes = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify(requestBody),
        });

        const fallbackText = await fallbackRes.text();
        let fallbackJson: unknown = null;

        try {
          fallbackJson = JSON.parse(fallbackText);
        } catch {
          fallbackJson = null;
        }

        if (!fallbackRes.ok) {
          const fallbackMessage =
            (fallbackJson as { error?: string } | null)?.error ??
            fallbackText ??
            `HTTP ${fallbackRes.status}`;
          throw new Error(fallbackMessage);
        }

        data = fallbackJson;
        invokeError = null;
      }

      if (invokeError) {
        let details = invokeError.message || 'Échec de la requête';
        const context = invokeError.context;
        if (context instanceof Response) {
          try {
            const bodyText = await context.text();
            if (bodyText) details = `${details} | ${bodyText}`;
          } catch {
            // Keep the base error message when response parsing fails.
          }
        }
        throw new Error(details);
      }

      if ((data as { error?: string })?.error) {
        throw new Error((data as { error: string }).error);
      }

      return data;
    },
    []
  );

  const sendDirectInvitations = async () => {
    if (directInviteSending || selectedGuestsForDirectInvite.length === 0) return;

    const selectedGuests = selectedGuestsForDirectInvite;
    const selectedCount = selectedGuests.length;
    const comboLabel = invitationComboLabel(invitationChannelCombo);

    const confirmed = confirm(
      directInviteDryRun
        ? `Lancer une simulation d'envoi (${comboLabel}) pour ${selectedCount} invité(s) ? Aucun message réel ne sera envoyé.`
        : `Envoyer maintenant via ${comboLabel} pour ${selectedCount} invité(s) ?`
    );

    if (!confirmed) return;

    setDirectInviteSending(true);
    setDirectInviteResult(null);
    setDirectInviteDetails([]);

    try {
      const guestsForInvitation = selectedGuests.map((guest) => ({
        id: guest.id,
        first_name: guest.first_name,
        last_name: guest.last_name,
        post_name: guest.post_name,
        is_couple: guest.is_couple,
        phone: guest.phone || '',
        rsvp_contact_phone: guest.rsvp_contact_phone || '',
        rsvp_contact_email: guest.rsvp_contact_email || '',
      }));

      const runSms = channelHasSms;
      const runWhatsapp = channelHasWhatsapp;
      const runEmail = channelHasEmail;

      let sms = { eligible: 0, sent: 0, failed: 0 };
      let whatsapp = { eligible: 0, sent: 0, failed: 0 };
      let email = { eligible: 0, sent: 0, failed: 0 };
      let allErrors: string[] = [];
      let directDetailsCollected: DirectGuestDetail[] = [];
      const bulkDetailsCollected: BulkGuestDetail[] = [];
      const invitationData = (await invokeEdgeFunction('notify-invitations', {
        channels: {
          sms: runSms,
          email: runEmail,
          whatsapp: runWhatsapp,
        },
        dry_run: directInviteDryRun,
        mark_sent: !directInviteDryRun,
        guests: guestsForInvitation,
      })) as {
        summary?: {
          sms: { eligible: number; sent: number; failed: number };
          whatsapp: { eligible: number; sent: number; failed: number };
          email: { eligible: number; sent: number; failed: number };
          details?: DirectGuestDetail[];
          errors: string[];
        };
      };

      if (invitationData.summary) {
        sms = invitationData.summary.sms;
        whatsapp = invitationData.summary.whatsapp;
        email = invitationData.summary.email;
        directDetailsCollected = invitationData.summary.details ?? [];
        allErrors = [...allErrors, ...(invitationData.summary.errors ?? [])];
      }

      const detailLines: string[] = [
        `${directInviteDryRun ? 'Simulation terminée' : 'Envoi terminé'} pour ${selectedCount} invité(s) via ${comboLabel}.`,
      ];

      if (runSms) {
        detailLines.push(`SMS: ${sms.sent} accepté(s) par le fournisseur, ${sms.failed} échec(s), ${sms.eligible} éligible(s).`);
      }
      if (runWhatsapp) {
        detailLines.push(`WhatsApp: ${whatsapp.sent} envoyé(s), ${whatsapp.failed} échec(s), ${whatsapp.eligible} éligible(s).`);
      }
      if (runEmail) {
        detailLines.push(`E-mail: ${email.sent} envoyé(s), ${email.failed} échec(s), ${email.eligible} éligible(s).`);
      }

      if (runSms && sms.sent > 0) {
        detailLines.push('Note: pour le SMS, "accepté" signifie que le fournisseur a pris la requête en charge. La réception sur le téléphone n\'est pas confirmée par ce système.');
      }

      detailLines.push(allErrors.length > 0 ? `Attention: ${allErrors.length} point(s) à vérifier.` : 'Aucune erreur signalée.');

      const totalSent = (runSms ? sms.sent : 0) + (runWhatsapp ? whatsapp.sent : 0) + (runEmail ? email.sent : 0);
      const totalFailed = (runSms ? sms.failed : 0) + (runWhatsapp ? whatsapp.failed : 0) + (runEmail ? email.failed : 0);
      const requestedSmsChannels = runSms;
      const smsSentTotal = runSms ? sms.sent : 0;

      if (!directInviteDryRun && requestedSmsChannels && smsSentTotal === 0) {
        const technical = allErrors.slice(0, 3).join(' | ') || 'Le fournisseur SMS n\'a confirmé aucun envoi.';
        setDirectInviteResult(userError('SMS non livré: aucun SMS réel n\'a été envoyé.', technical));
      } else if (!directInviteDryRun && totalSent === 0) {
        const technical = allErrors.slice(0, 3).join(' | ') || 'Vérifiez les logs de dispatch et la configuration Afrikatalk.';
        setDirectInviteResult(userError('Aucun message réel n\'a été envoyé.', technical));
      } else if (!directInviteDryRun && (totalFailed > 0 || allErrors.length > 0)) {
        const technical = allErrors.slice(0, 3).join(' | ') || `${totalFailed} échec(s) signalé(s) par le fournisseur.`;
        setDirectInviteResult(userError('Envoi terminé avec des échecs partiels.', technical));
      } else {
        setDirectInviteResult(detailLines.join(' | '));
      }
      setDirectInviteDetails(directDetailsCollected);

      const sessionEntries: NewDispatchLogRow[] = [];

      for (const item of bulkDetailsCollected) {
        if (item.sms) {
          sessionEntries.push({
            source_function: 'notify-all-guests',
            event_type: 'bulk_notification',
            channel: 'sms',
            recipient_type: 'guest',
            guest_name: item.guest_name,
            target: item.sms.target || null,
            status: item.sms.status,
            error_message: item.sms.reason ?? null,
            dry_run: directInviteDryRun,
            provider: 'africastalking',
          });
        }

        if (item.email) {
          sessionEntries.push({
            source_function: 'notify-all-guests',
            event_type: 'bulk_notification',
            channel: 'email',
            recipient_type: 'guest',
            guest_name: item.guest_name,
            target: item.email.target || null,
            status: item.email.status,
            error_message: item.email.reason ?? null,
            dry_run: directInviteDryRun,
            provider: 'resend',
          });
        }
      }

      for (const item of directDetailsCollected) {
        if (item.sms) {
          sessionEntries.push({
            source_function: 'notify-invitations',
            event_type: 'invitation_direct',
            channel: 'sms',
            recipient_type: 'guest',
            guest_name: item.guest_name,
            target: item.sms.target || null,
            status: item.sms.status,
            error_message: item.sms.reason ?? null,
            dry_run: directInviteDryRun,
            provider: 'africastalking',
          });
        }

        if (item.whatsapp) {
          sessionEntries.push({
            source_function: 'notify-invitations',
            event_type: 'invitation_direct',
            channel: 'whatsapp',
            recipient_type: 'guest',
            guest_name: item.guest_name,
            target: item.whatsapp.target || null,
            status: item.whatsapp.status,
            error_message: item.whatsapp.reason ?? null,
            dry_run: directInviteDryRun,
            provider: 'meta-whatsapp',
          });
        }

        if (item.email) {
          sessionEntries.push({
            source_function: 'notify-invitations',
            event_type: 'invitation_direct',
            channel: 'email',
            recipient_type: 'guest',
            guest_name: item.guest_name,
            target: item.email.target || null,
            status: item.email.status,
            error_message: item.email.reason ?? null,
            dry_run: directInviteDryRun,
            provider: 'resend',
          });
        }
      }

      if (allErrors.length > 0 && sessionEntries.length === 0) {
        sessionEntries.push({
          source_function: 'notify-invitations',
          event_type: 'invitation_direct',
          channel: runWhatsapp ? 'whatsapp' : runSms ? 'sms' : 'email',
          recipient_type: 'admin',
          guest_name: null,
          target: null,
          status: 'failed',
          error_message: allErrors.slice(0, 3).join(' | '),
          dry_run: directInviteDryRun,
          provider: null,
        });
      }

      const logsLoaded = await loadDispatchLogs();
      if (!logsLoaded) {
        appendSessionDispatchLogs(sessionEntries);
      }

      if (!directInviteDryRun) {
        await loadGuests();
      }

      setDirectInviteSending(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur d\'invocation inconnue';
      const isNetworkFailure = /failed to fetch|network|load failed/i.test(message);
      if (isNetworkFailure) {
        setDirectInviteResult(userError('Connexion impossible au service d\'envoi. Vérifiez Internet puis réessayez.', message));
      } else {
        setDirectInviteResult(userError('Une erreur a interrompu l\'envoi ciblé.', message));
      }
      setDirectInviteSending(false);
    }
  };

  const sendBulkNotifications = async () => {
    if (bulkSending) return;

    const comboLabel = invitationComboLabel(invitationChannelCombo);

    const confirmed = confirm(
      bulkDryRun
        ? `Lancer une simulation (${comboLabel}) ? Aucun message réel ne sera envoyé.`
        : `Envoyer maintenant via ${comboLabel} ? Cette action peut consommer des crédits SMS/WhatsApp/e-mail.`
    );

    if (!confirmed) return;

    setBulkSending(true);
    setBulkResult(null);
    setBulkDetails([]);
    setBulkDiagResult(null);

    const selectedGuestsForBulk = guests
      .filter((guest) => {
        const rsvpOk = bulkRsvpFilter === 'all' || guest.rsvp_status === bulkRsvpFilter;
        const typeOk = bulkTypeFilter === 'all' || normalizePersonType(guest.person_type, guest.group_name) === bulkTypeFilter;
        const coupleOk =
          bulkCoupleFilter === 'all' ||
          (bulkCoupleFilter === 'couple' && guest.is_couple) ||
          (bulkCoupleFilter === 'not_couple' && !guest.is_couple);
        return rsvpOk && typeOk && coupleOk;
      })
      .map((guest) => ({
        id: guest.id,
        first_name: guest.first_name,
        last_name: guest.last_name,
        post_name: guest.post_name,
        gender: guest.gender,
        is_couple: guest.is_couple,
        person_type: normalizePersonType(guest.person_type, guest.group_name),
        rsvp_status: guest.rsvp_status,
        phone: guest.phone || '',
        rsvp_contact_phone: guest.rsvp_contact_phone || '',
        rsvp_contact_email: guest.rsvp_contact_email || '',
      }));

    try {
      const guestsForInvitation = selectedGuestsForBulk.map((guest) => ({
        id: guest.id,
        first_name: guest.first_name,
        last_name: guest.last_name,
        post_name: guest.post_name,
        is_couple: guest.is_couple,
        phone: guest.phone || '',
        rsvp_contact_phone: guest.rsvp_contact_phone || '',
        rsvp_contact_email: guest.rsvp_contact_email || '',
      }));

      const runSms = channelHasSms;
      const runWhatsapp = channelHasWhatsapp;
      const runEmail = channelHasEmail;

      let sms = { eligible: 0, sent: 0, failed: 0 };
      let whatsapp = { eligible: 0, sent: 0, failed: 0 };
      let email = { eligible: 0, sent: 0, failed: 0 };
      let allErrors: string[] = [];
      let mergedBulkDetails: BulkGuestDetail[] = [];
      let invitationDetailsForLogs: DirectGuestDetail[] = [];

      const invitationData = (await invokeEdgeFunction('notify-invitations', {
        channels: {
          sms: runSms,
          email: runEmail,
          whatsapp: runWhatsapp,
        },
        dry_run: bulkDryRun,
        mark_sent: !bulkDryRun,
        guests: guestsForInvitation,
      })) as {
        summary?: {
          sms: { eligible: number; sent: number; failed: number };
          whatsapp: { eligible: number; sent: number; failed: number };
          email: { eligible: number; sent: number; failed: number };
          details?: DirectGuestDetail[];
          errors: string[];
        };
      };

      if (invitationData.summary) {
        sms = invitationData.summary.sms;
        whatsapp = invitationData.summary.whatsapp;
        email = invitationData.summary.email;
        invitationDetailsForLogs = invitationData.summary.details ?? [];
        mergedBulkDetails = (invitationData.summary.details ?? []).map((item) => ({
          guest_id: item.guest_id,
          guest_name: item.guest_name,
          sms: item.sms,
          email: item.email,
        }));
        allErrors = [...allErrors, ...(invitationData.summary.errors ?? [])];
      }

      const details = [
        `${bulkDryRun ? 'Simulation terminée' : 'Envoi terminé'}: ${selectedGuestsForBulk.length} invité(s) ciblé(s) via ${comboLabel}.`,
      ];

      if (runSms) {
        details.push(`SMS: ${sms.sent} accepté(s) par le fournisseur, ${sms.failed} échec(s), ${sms.eligible} éligible(s).`);
      }
      if (runWhatsapp) {
        details.push(`WhatsApp: ${whatsapp.sent} envoyé(s), ${whatsapp.failed} échec(s), ${whatsapp.eligible} éligible(s).`);
      }
      if (runEmail) {
        details.push(`E-mail: ${email.sent} envoyé(s), ${email.failed} échec(s), ${email.eligible} éligible(s).`);
      }

      if (runSms && sms.sent > 0) {
        details.push('Note: pour le SMS, "accepté" signifie que le fournisseur a pris la requête en charge. La réception sur le téléphone n\'est pas confirmée par ce système.');
      }

      details.push(allErrors.length > 0 ? `Attention: ${allErrors.length} point(s) à vérifier.` : 'Aucune erreur signalée.');

      const totalSent = (runSms ? sms.sent : 0) + (runWhatsapp ? whatsapp.sent : 0) + (runEmail ? email.sent : 0);
      const totalFailed = (runSms ? sms.failed : 0) + (runWhatsapp ? whatsapp.failed : 0) + (runEmail ? email.failed : 0);
      const requestedSmsChannels = runSms;
      const smsSentTotal = runSms ? sms.sent : 0;

      if (!bulkDryRun && requestedSmsChannels && smsSentTotal === 0) {
        const technical = allErrors.slice(0, 3).join(' | ') || 'Le fournisseur SMS n\'a confirmé aucun envoi.';
        setBulkResult(userError('SMS non livré: aucun SMS réel n\'a été envoyé.', technical));
      } else if (!bulkDryRun && totalSent === 0) {
        const technical = allErrors.slice(0, 3).join(' | ') || 'Vérifiez les logs de dispatch et la configuration Afrikatalk.';
        setBulkResult(userError('Aucun message réel n\'a été envoyé.', technical));
      } else if (!bulkDryRun && (totalFailed > 0 || allErrors.length > 0)) {
        const technical = allErrors.slice(0, 3).join(' | ') || `${totalFailed} échec(s) signalé(s) par le fournisseur.`;
        setBulkResult(userError('Envoi global terminé avec des échecs partiels.', technical));
      } else {
        setBulkResult(details.join(' | '));
      }
      setBulkDetails(mergedBulkDetails);

      const sessionEntries: NewDispatchLogRow[] = [];

      for (const item of mergedBulkDetails) {
        if (item.sms) {
          sessionEntries.push({
            source_function: 'notify-all-guests',
            event_type: 'bulk_notification',
            channel: 'sms',
            recipient_type: 'guest',
            guest_name: item.guest_name,
            target: item.sms.target || null,
            status: item.sms.status,
            error_message: item.sms.reason ?? null,
            dry_run: bulkDryRun,
            provider: 'africastalking',
          });
        }

        if (item.email) {
          sessionEntries.push({
            source_function: 'notify-invitations',
            event_type: 'invitation_direct',
            channel: 'email',
            recipient_type: 'guest',
            guest_name: item.guest_name,
            target: item.email.target || null,
            status: item.email.status,
            error_message: item.email.reason ?? null,
            dry_run: bulkDryRun,
            provider: 'resend',
          });
        }
      }

      for (const item of invitationDetailsForLogs) {
        if (item.whatsapp) {
          sessionEntries.push({
            source_function: 'notify-invitations',
            event_type: 'invitation_direct',
            channel: 'whatsapp',
            recipient_type: 'guest',
            guest_name: item.guest_name,
            target: item.whatsapp.target || null,
            status: item.whatsapp.status,
            error_message: item.whatsapp.reason ?? null,
            dry_run: bulkDryRun,
            provider: 'meta-whatsapp',
          });
        }
      }

      if (allErrors.length > 0 && sessionEntries.length === 0) {
        sessionEntries.push({
          source_function: 'notify-invitations',
          event_type: 'invitation_direct',
          channel: runWhatsapp ? 'whatsapp' : runSms ? 'sms' : 'email',
          recipient_type: 'admin',
          guest_name: null,
          target: null,
          status: 'failed',
          error_message: allErrors.slice(0, 3).join(' | '),
          dry_run: bulkDryRun,
          provider: null,
        });
      }

      const logsLoaded = await loadDispatchLogs();
      if (!logsLoaded) {
        appendSessionDispatchLogs(sessionEntries);
      }
      setBulkSending(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur d\'invocation inconnue';
      const isNetworkFailure = /failed to fetch|network|load failed/i.test(message);
      if (isNetworkFailure) {
        setBulkResult(userError('Connexion impossible au service d\'envoi global. Vérifiez Internet puis réessayez.', message));
      } else {
        setBulkResult(userError('Une erreur a interrompu l\'envoi global.', message));
      }
      setBulkSending(false);
    }
  };

  const runBulkDiagnostics = async () => {
    if (bulkDiagLoading) return;

    setBulkDiagLoading(true);
    setBulkDiagResult(null);

    try {
      const checks: string[] = [];

      if (!supabaseUrl || !supabaseAnonKey) {
        setBulkDiagResult(userError('La configuration d\'envoi global est incomplète sur ce site.'));
        setBulkDiagLoading(false);
        return;
      }

      checks.push(`Adresse du service: ${supabaseUrl}`);
      checks.push(`Connexion Internet détectée: ${navigator.onLine ? 'oui' : 'non'}`);

      const healthRes = await fetch(`${supabaseUrl}/functions/v1/notify-all-guests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          channel: 'both',
          dry_run: true,
          guests: [
            {
              id: 'diag-1',
              first_name: 'Diag',
              last_name: 'Guest',
              post_name: '',
              gender: 'male',
              person_type: 'family',
              rsvp_status: 'attending',
              phone: '+243816300058',
              rsvp_contact_phone: '',
              rsvp_contact_email: 'diag@example.com',
            },
          ],
        }),
      });

      const healthText = await healthRes.text();
      checks.push(`Code de réponse du service: ${healthRes.status}`);

      if (!healthRes.ok) {
        checks.push(`Détail: ${simplifyTechnicalError(healthText.slice(0, 220))}`);
      } else {
        checks.push('Le service d\'envoi global répond correctement.');
      }

      setBulkDiagResult(checks.join(' | '));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setBulkDiagResult(userError('Impossible de réaliser le diagnostic de connexion.', message));
    }

    setBulkDiagLoading(false);
  };

  const statusClasses = (status: 'eligible' | 'sent' | 'delivered' | 'failed' | 'skipped') => {
    if (status === 'delivered') return 'text-green-200 border-green-400/50 bg-green-900/30';
    if (status === 'sent') return 'text-sky-200 border-sky-500/40 bg-sky-900/20';
    if (status === 'failed') return 'text-red-300 border-red-500/40 bg-red-900/20';
    if (status === 'skipped') return 'text-amber-300 border-amber-500/40 bg-amber-900/20';
    return 'text-white/70 border-white/20 bg-white/5';
  };

  const statusLabel = (status: 'eligible' | 'sent' | 'delivered' | 'failed' | 'skipped', channel?: DispatchChannel | 'email' | 'sms' | 'whatsapp') => {
    if (status === 'delivered') return channel === 'sms' || channel === 'whatsapp' ? 'livre' : 'delivre';
    if (status === 'sent') return channel === 'sms' || channel === 'whatsapp' ? 'accepte' : 'envoye';
    if (status === 'failed') return 'echec';
    if (status === 'skipped') return 'ignore';
    return 'eligible';
  };

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddGuestMessage(null);
    const { first_name, last_name, post_name } = newGuest;
    const firstNameTrimmed = first_name.trim();
    const lastNameTrimmed = last_name.trim();
    const postNameTrimmed = post_name.trim();

    if (!firstNameTrimmed || !lastNameTrimmed) {
      setAddGuestMessage('Le prenom et le nom sont obligatoires.');
      return;
    }

    const newNameKey = guestNameKey(firstNameTrimmed, lastNameTrimmed);
    const duplicateInState = guests.some((guest) => guestNameKey(guest.first_name, guest.last_name) === newNameKey);
    if (duplicateInState) {
      setAddGuestMessage(`Cette personne existe déjà: ${firstNameTrimmed} ${lastNameTrimmed}. Aucun nouvel ajout n'a été fait.`);
      return;
    }

    try {
      const { data: existingGuest, error: duplicateCheckError } = await guestsTable()
        .select('id')
        .ilike('first_name', firstNameTrimmed)
        .ilike('last_name', lastNameTrimmed)
        .limit(1);

      if (duplicateCheckError) {
        setAddGuestMessage(userError('Impossible de vérifier les doublons avant l\'ajout.', duplicateCheckError.message));
        return;
      }

      if (existingGuest && existingGuest.length > 0) {
        setAddGuestMessage(`Cette personne existe déjà: ${firstNameTrimmed} ${lastNameTrimmed}. Aucun nouvel ajout n'a été fait.`);
        return;
      }

      const { error } = await guestsTable().insert({
        first_name: firstNameTrimmed,
        last_name: lastNameTrimmed,
        post_name: postNameTrimmed || '',
        invitation_status: 'pending',
        rsvp_status: 'pending',
        person_type: newGuest.person_type,
        phone: newGuest.phone.trim() || '',
        rsvp_contact_email: newGuest.email.trim() || '',
        gender: newGuest.gender,
        is_couple: newGuest.is_couple,
        partner_first_name: '',
        partner_last_name: '',
        partner_post_name: '',
        partner_phone: '',
        partner_gender: 'female',
      });

      if (error) {
        console.error('Error adding guest:', error);
        setAddGuestMessage(userError('L\'invité n\'a pas pu être ajouté.', error.message));
      } else {
        setAddGuestMessage('Succès: l\'invité a été ajouté à la liste.');
        setNewGuest(emptyGuest);
        setTimeout(() => loadGuests(), 500);
        setTimeout(() => setAddGuestMessage(null), 3000);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : null;
      setAddGuestMessage(userError('Une erreur inattendue est survenue pendant l\'ajout.', message));
      console.error(err);
    }
  };

  const stats = {
    total_records: guests.length,
    total_people: guests.reduce((sum, guest) => sum + peopleCountForGuest(guest), 0),
    attending_people: guests
      .filter((g) => g.rsvp_status === 'attending')
      .reduce((sum, guest) => sum + peopleCountForGuest(guest), 0),
    pending_people: guests
      .filter((g) => g.rsvp_status === 'pending')
      .reduce((sum, guest) => sum + peopleCountForGuest(guest), 0),
    not_attending_people: guests
      .filter((g) => g.rsvp_status === 'not_attending')
      .reduce((sum, guest) => sum + peopleCountForGuest(guest), 0),
  };

  const rsvpBadge = (status: Guest['rsvp_status']) => {
    switch (status) {
      case 'attending': return 'bg-green-900/40 text-green-400 border-green-500/30';
      case 'not_attending': return 'bg-red-900/40 text-red-400 border-red-500/30';
      case 'maybe': return 'bg-amber-900/40 text-amber-400 border-amber-500/30';
      default: return 'bg-white/5 text-white/40 border-white/10';
    }
  };

  const guestTableHeaderCellClass = compactGuestTable ? 'px-2 py-2' : 'px-4 py-3';
  const guestTableCellClass = compactGuestTable ? 'px-2 py-2' : 'px-4 py-3';

  if (!unlocked) {
    return (
      <section id="admin" className="relative py-24 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black to-navy/10" />
        <div className="relative z-10 max-w-md mx-auto">
          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-full border-2 border-gold/40 bg-gold/10 flex items-center justify-center mx-auto mb-5">
              <Lock className="w-7 h-7 text-gold" />
            </div>
            <h2 className="font-cinzel text-3xl font-bold text-white mb-2">Acces administrateur</h2>
            <p className="font-cormorant text-white/45 text-base">Reserve au couple et aux coordinateurs</p>
          </div>
          <form onSubmit={handleLogin} className="border border-gold/20 rounded-2xl p-8 backdrop-blur-sm bg-black/50 space-y-5">
            <div>
              <label className="block font-cormorant text-white/60 text-sm tracking-widest uppercase mb-2">
                Mot de passe administrateur
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/60 border border-gold/20 rounded-lg px-4 py-3 font-cormorant text-white text-base focus:outline-none focus:border-gold/50 transition-colors"
                placeholder="Entrez le mot de passe"
              />
              {pwError && (
                <p className="font-cormorant text-red-400/70 text-sm mt-1">Mot de passe incorrect.</p>
              )}
            </div>
            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-gold/80 to-gold text-black font-cinzel text-sm font-bold tracking-widest uppercase transition-all hover:from-gold hover:to-amber-400"
            >
              Acceder au tableau de bord
            </button>
          </form>
        </div>
      </section>
    );
  }

  return (
    <section id="admin" className="relative py-24 px-6 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black to-navy/10" />
      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="font-cinzel text-3xl font-bold text-white">Tableau de bord administrateur</h2>
            <p className="font-cormorant text-white/40 text-sm">Gestion du mariage de Jonathan et Maria</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadGuests}
              className="flex items-center gap-2 px-4 py-2 border border-gold/20 rounded-lg text-white/60 hover:text-gold hover:border-gold/40 transition-all font-cormorant text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Actualiser
            </button>
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 border border-gold/20 rounded-lg text-white/60 hover:text-gold hover:border-gold/40 transition-all font-cormorant text-sm"
            >
              <Download className="w-4 h-4" />
              Exporter en CSV
            </button>
            <button
              onClick={exportFilteredAdminView}
              className="flex items-center gap-2 px-4 py-2 border border-gold/20 rounded-lg text-white/60 hover:text-gold hover:border-gold/40 transition-all font-cormorant text-sm"
            >
              <Download className="w-4 h-4" />
              Exporter la vue filtrée
            </button>
          </div>
        </div>

        <div className="mb-8 rounded-2xl border border-gold/15 bg-black/30 p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <p className="font-cinzel text-[11px] tracking-widest uppercase text-gold/80">Organisation verticale</p>
            <button
              type="button"
              onClick={resetAdminLayout}
              className="px-3 py-1.5 rounded-lg border border-gold/20 text-white/70 hover:text-gold hover:border-gold/40 transition-all font-cormorant text-xs"
            >
              Réinitialiser le layout
            </button>
          </div>
          <div className="mb-2 grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2">
            <input
              type="text"
              value={adminQuickSearch}
              onChange={(e) => setAdminQuickSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  runAdminQuickSearch();
                }
              }}
              placeholder="Recherche globale: ex. journal WhatsApp, import CSV, invité Marie..."
              className="bg-black/50 border border-gold/20 rounded-lg px-4 py-2.5 font-cormorant text-white text-sm placeholder:text-white/35 focus:outline-none focus:border-gold/50"
            />
            <button
              type="button"
              onClick={runAdminQuickSearch}
              className="px-4 py-2.5 border border-gold/30 rounded-lg text-gold hover:bg-gold/10 transition-all font-cinzel text-[11px] tracking-widest uppercase"
            >
              Rechercher
            </button>
            <div className="px-3 py-2.5 rounded-lg border border-gold/15 bg-black/40 text-center min-w-[130px]">
              <p className="font-cormorant text-white/45 text-[11px] uppercase tracking-widest">{adminQuickSearchPreview.label}</p>
              <p className="font-cinzel text-gold text-lg leading-none mt-1">{adminQuickSearchPreview.count}</p>
            </div>
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyGuestQuickPreset('missing_contact')}
              className={`px-3 py-2 rounded-lg border transition-all font-cormorant text-xs ${
                isMissingContactPresetActive
                  ? 'border-gold/60 text-gold bg-gold/15 shadow-[0_0_0_1px_rgba(212,175,55,0.2)]'
                  : 'border-gold/20 text-white/75 hover:text-gold hover:border-gold/45'
              }`}
            >
              Invités sans contact
            </button>
            <button
              type="button"
              onClick={() => applyGuestQuickPreset('pending_rsvp')}
              className={`px-3 py-2 rounded-lg border transition-all font-cormorant text-xs ${
                isPendingRsvpPresetActive
                  ? 'border-gold/60 text-gold bg-gold/15 shadow-[0_0_0_1px_rgba(212,175,55,0.2)]'
                  : 'border-gold/20 text-white/75 hover:text-gold hover:border-gold/45'
              }`}
            >
              RSVP en attente
            </button>
            <button
              type="button"
              onClick={applyFailedLogsShortcut}
              className={`px-3 py-2 rounded-lg border transition-all font-cormorant text-xs ${
                isFailedLogsShortcutActive
                  ? 'border-red-400/70 text-red-200 bg-red-900/20 shadow-[0_0_0_1px_rgba(248,113,113,0.2)]'
                  : 'border-gold/20 text-white/75 hover:text-gold hover:border-gold/45'
              }`}
            >
              Logs en échec
            </button>
          </div>
          {recentQuickSearches.length > 0 && (
            <div className="mb-3 rounded-xl border border-gold/15 bg-black/35 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <p className="font-cinzel text-[11px] tracking-widest uppercase text-white/55">5 dernières recherches</p>
                <button
                  type="button"
                  onClick={() => setRecentQuickSearches([])}
                  className="px-2 py-1 rounded border border-gold/15 text-white/60 hover:text-gold hover:border-gold/40 transition-all font-cormorant text-[11px]"
                >
                  Vider
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentQuickSearches.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setAdminQuickSearch(item);
                      executeAdminQuickSearch(item);
                    }}
                    className="px-3 py-1.5 rounded-full border border-gold/20 text-white/75 hover:text-gold hover:border-gold/45 transition-all font-cormorant text-xs"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {[
              { section: 'dashboard' as const, label: '1. Pilotage' },
              { section: 'workspace' as const, label: '2. Invitations', customId: 'admin-invitations-center' },
              { section: 'journal' as const, label: '3. Journal' },
            ].map((item) => (
              <button
                key={item.section}
                type="button"
                onClick={() => {
                  if ('customId' in item && item.customId) {
                    const elem = document.getElementById(item.customId);
                    if (elem) {
                      elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  } else {
                    expandAndScrollTo(item.section);
                  }
                }}
                className="px-3 py-2 rounded-lg border border-gold/20 text-white/75 hover:text-gold hover:border-gold/45 transition-all font-cormorant text-sm text-center"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          <AdminSectionCard
            id="admin-dashboard"
            title={
              <span className="inline-flex items-center gap-2">
                <Users className="w-5 h-5 text-gold" />
                Pilotage général
              </span>
            }
            subtitle="Vue d'ensemble rapide pour suivre l'état des invités avant toute action opérationnelle."
            collapsed={collapsedSections.dashboard}
            onToggle={() => toggleSection('dashboard')}
          >
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: 'Fiches invités', value: stats.total_records, icon: Users, color: 'text-white' },
                { label: 'Personnes invitées', value: stats.total_people, icon: Users, color: 'text-gold' },
                { label: 'Présents (pers.)', value: stats.attending_people, icon: CheckCircle, color: 'text-green-400' },
                { label: 'En attente (pers.)', value: stats.pending_people, icon: Clock, color: 'text-amber-400' },
                { label: 'Absents (pers.)', value: stats.not_attending_people, icon: XCircle, color: 'text-red-400' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="border border-gold/15 rounded-xl p-5 bg-black/35">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${color}`} />
                    <span className="font-cormorant text-white/50 text-xs tracking-widest uppercase">{label}</span>
                  </div>
                  <p className={`font-cinzel text-3xl font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          </AdminSectionCard>

          <AdminSectionCard
            id="admin-journal"
            title={
              <span className="inline-flex items-center gap-2">
                <History className="w-5 h-5 text-gold" />
                Journal des envois (SMS, WhatsApp, e-mail)
              </span>
            }
            subtitle="Historique global des envois enregistrés dans message_dispatch_logs."
            collapsed={collapsedSections.journal}
            onToggle={() => toggleSection('journal')}
          >
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={runWhatsAppDiagnostics}
                disabled={whatsappDiagLoading}
                className="px-4 py-2.5 border border-gold/25 rounded-lg text-white/70 hover:text-gold hover:border-gold/45 transition-all font-cormorant text-sm disabled:opacity-50"
              >
                {whatsappDiagLoading ? 'Test WhatsApp...' : 'Tester config WhatsApp'}
              </button>
              <button
                type="button"
                onClick={loadDispatchLogs}
                disabled={dispatchLogsLoading}
                className="px-4 py-2.5 border border-gold/25 rounded-lg text-white/70 hover:text-gold hover:border-gold/45 transition-all font-cormorant text-sm disabled:opacity-50"
              >
                {dispatchLogsLoading ? 'Actualisation...' : 'Actualiser le journal'}
              </button>
              <button
                type="button"
                onClick={deleteSelectedDispatchLogs}
                disabled={dispatchLogsDeleting || selectedDispatchLogIds.length === 0}
                className="px-4 py-2.5 border border-red-500/35 rounded-lg text-red-300/90 hover:text-red-200 hover:border-red-400 transition-all font-cormorant text-sm disabled:opacity-40"
              >
                Supprimer la sélection ({selectedDispatchLogIds.length})
              </button>
              <button
                type="button"
                onClick={deleteAllDispatchLogs}
                disabled={dispatchLogsDeleting || allDispatchLogs.length === 0}
                className="px-4 py-2.5 border border-red-500/35 rounded-lg text-red-300/90 hover:text-red-200 hover:border-red-400 transition-all font-cormorant text-sm disabled:opacity-40"
              >
                Tout effacer
              </button>
            </div>
          </div>

          {dispatchLogsActionMessage && (
            <div className={`mb-4 rounded-lg px-4 py-3 border font-cormorant text-sm ${isErrorMessage(dispatchLogsActionMessage) ? 'border-red-500/40 bg-red-900/20 text-red-300' : 'border-green-500/40 bg-green-900/20 text-green-300'}`}>
              {dispatchLogsActionMessage}
            </div>
          )}

            <>

              {whatsappDiagResult && (
                <div className={`mb-4 rounded-lg px-4 py-3 border font-cormorant text-sm ${isErrorMessage(whatsappDiagResult) ? 'border-red-500/40 bg-red-900/20 text-red-300' : 'border-green-500/40 bg-green-900/20 text-green-300'}`}>
                  {whatsappDiagResult}
                </div>
              )}

              {dispatchLogsError && (
                <div className="mb-4 rounded-lg px-4 py-3 border border-red-500/40 bg-red-900/20 text-red-300 font-cormorant text-sm">
                  {dispatchLogsError}
                </div>
              )}

              {dispatchLogs.length === 0 && sessionLogs.length > 0 && !dispatchLogsLoading && (
                <div className="mb-3 rounded-lg px-4 py-2 border border-amber-500/30 bg-amber-900/15 text-amber-300/80 font-cormorant text-xs">
                  Données de session (non persistées en base). Les fonctions Edge n'ont pas encore été redéployées avec le code de journalisation — actualisez après redéploiement pour voir les logs persistants.
                </div>
              )}

              {allDispatchLogs.length > 0 && (
                <div className="mb-3 grid grid-cols-1 md:grid-cols-[1fr_1fr_2fr_auto] gap-2">
                  <select
                    value={dispatchLogChannelFilter}
                    onChange={(e) => setDispatchLogChannelFilter(e.target.value as DispatchChannel | 'all')}
                    className="bg-black/50 border border-gold/20 rounded-lg px-3 py-2 font-cormorant text-white text-sm focus:outline-none focus:border-gold/50"
                  >
                    <option value="all">Tous les canaux</option>
                    <option value="sms">SMS</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">E-mail</option>
                  </select>
                  <select
                    value={dispatchLogStatusFilter}
                    onChange={(e) => setDispatchLogStatusFilter(e.target.value as DispatchStatus | 'all')}
                    className="bg-black/50 border border-gold/20 rounded-lg px-3 py-2 font-cormorant text-white text-sm focus:outline-none focus:border-gold/50"
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="eligible">Éligible</option>
                    <option value="sent">Envoyé</option>
                    <option value="delivered">Livré</option>
                    <option value="failed">Échec</option>
                    <option value="skipped">Ignoré</option>
                  </select>
                  <input
                    type="text"
                    value={dispatchLogSearchTerm}
                    onChange={(e) => setDispatchLogSearchTerm(e.target.value)}
                    placeholder="Rechercher (source, invité, cible, erreur...)"
                    className="bg-black/50 border border-gold/20 rounded-lg px-3 py-2 font-cormorant text-white text-sm placeholder-white/35 focus:outline-none focus:border-gold/50"
                  />
                  <button
                    type="button"
                    onClick={resetDispatchLogFilters}
                    className="px-3 py-2 border border-gold/20 rounded-lg text-white/70 hover:text-gold hover:border-gold/40 transition-all font-cormorant text-sm"
                  >
                    Réinitialiser
                  </button>
                </div>
              )}

              {allDispatchLogs.length === 0 && !dispatchLogsLoading && !dispatchLogsError && (
                <div className="rounded-lg px-4 py-3 border border-gold/15 bg-black/45 text-white/65 font-cormorant text-sm">
                  Aucun log pour le moment. Lance un dry run ou un envoi réel pour générer des lignes.
                </div>
              )}

              {allDispatchLogs.length > 0 && filteredDispatchLogs.length === 0 && !dispatchLogsLoading && !dispatchLogsError && (
                <div className="rounded-lg px-4 py-3 border border-gold/15 bg-black/45 text-white/65 font-cormorant text-sm">
                  Aucun log ne correspond aux filtres actuels.
                </div>
              )}

              {filteredDispatchLogs.length > 0 && (
                <div className="border border-gold/15 rounded-xl overflow-hidden">
                  <div className="max-h-80 overflow-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gold/10 bg-black/30">
                          <th className="px-4 py-2 text-left font-cinzel text-white/40 text-[11px] tracking-widest uppercase">
                            <input
                              type="checkbox"
                              checked={allDispatchLogsSelected}
                              onChange={(e) => toggleSelectAllDispatchLogs(e.target.checked)}
                              className="accent-gold"
                              aria-label="Tout sélectionner"
                            />
                          </th>
                          <th className="px-4 py-2 text-left font-cinzel text-white/40 text-[11px] tracking-widest uppercase">Date</th>
                          <th className="px-4 py-2 text-left font-cinzel text-white/40 text-[11px] tracking-widest uppercase">Source</th>
                          <th className="px-4 py-2 text-left font-cinzel text-white/40 text-[11px] tracking-widest uppercase">Canal</th>
                          <th className="px-4 py-2 text-left font-cinzel text-white/40 text-[11px] tracking-widest uppercase">Statut</th>
                          <th className="px-4 py-2 text-left font-cinzel text-white/40 text-[11px] tracking-widest uppercase">Destinataire</th>
                          <th className="px-4 py-2 text-left font-cinzel text-white/40 text-[11px] tracking-widest uppercase">Erreur</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDispatchLogs.map((item) => (
                          <tr key={item.id} className="border-b border-gold/5 align-top">
                            <td className="px-4 py-3 font-cormorant text-white/70 text-xs whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={selectedDispatchLogIds.includes(item.id)}
                                onChange={(e) => toggleDispatchLogSelection(item.id, e.target.checked)}
                                className="accent-gold"
                                aria-label={`Sélectionner la ligne ${item.id}`}
                              />
                            </td>
                            <td className="px-4 py-3 font-cormorant text-white/70 text-xs whitespace-nowrap">
                              {new Date(item.created_at).toLocaleString('fr-FR')}
                              <p className="text-white/35 mt-0.5">{item.dry_run ? 'simulation' : 'réel'}</p>
                            </td>
                            <td className="px-4 py-3 font-cormorant text-white text-sm">
                              <p>{item.source_function}</p>
                              <p className="text-white/40 text-xs">{item.event_type}</p>
                            </td>
                            <td className="px-4 py-3 font-cormorant text-white text-sm uppercase">{item.channel}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-block px-2 py-0.5 rounded border text-xs font-cormorant uppercase ${statusClasses(item.status)}`}>
                                {statusLabel(item.status, item.channel)}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-cormorant text-white/80 text-sm">
                              <p>{item.guest_name || recipientTypeLabel(item.recipient_type)}</p>
                              <p className="text-white/45 text-xs break-all">{item.target || '-'}</p>
                              {item.provider_message_id && <p className="text-white/35 text-xs break-all">ID fournisseur: {item.provider_message_id}</p>}
                              {item.provider_status && <p className="text-white/35 text-xs break-all">Statut fournisseur: {item.provider_status}</p>}
                              {item.delivered_at && <p className="text-green-300/70 text-xs break-all">Livré le: {new Date(item.delivered_at).toLocaleString('fr-FR')}</p>}
                            </td>
                            <td className="px-4 py-3 font-cormorant text-red-300/80 text-xs max-w-[280px] break-words">
                              {item.error_message || item.provider_status_detail || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          </AdminSectionCard>

          <AdminSectionCard
            id="admin-workspace"
            title="Opérations invités"
            subtitle="Import CSV, ajout manuel, filtres, édition et envois ciblés dans une seule zone de travail."
            collapsed={collapsedSections.workspace}
            onToggle={() => toggleSection('workspace')}
          >
        <div className="mb-6 rounded-xl border border-gold/15 bg-black/30 p-3 md:p-4">
          <p className="font-cinzel text-[11px] tracking-widest uppercase text-gold/80 mb-3">Espace de travail</p>
          <div className="flex flex-wrap gap-3">
          {(['guests', 'upload'] as AdminTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2.5 rounded-lg font-cinzel text-xs tracking-widest uppercase transition-all ${
                tab === t
                  ? 'bg-gold/15 border border-gold/55 text-gold shadow-[0_0_0_1px_rgba(212,175,55,0.25)]'
                  : 'border border-gold/15 text-white/40 hover:border-gold/30 hover:text-white/60'
              }`}
            >
              {t === 'guests' ? 'Mode gestion invités' : 'Mode import et ajout'}
            </button>
          ))}
          </div>
        </div>

        {tab === 'upload' && (
          <div className="space-y-6">
            <div className="border border-gold/20 rounded-2xl p-8 backdrop-blur-sm bg-black/40 space-y-5">
              <div>
                <h3 className="font-cinzel text-white text-lg font-bold mb-1">Importer une liste d'invités (CSV)</h3>
                <p className="font-cormorant text-white/50 text-base">
                  Colonnes prises en charge: <span className="text-gold/70">first_name, post_name, last_name, person_type, gender*, phone, email, is_couple</span>
                  <br />
                  <span className="text-white/45">Couple: utiliser is_couple = 1/true/oui/yes pour un couple, sinon 0/false/non.</span>
                </p>
              </div>
              <label className="block w-full border-2 border-dashed border-gold/25 rounded-xl p-10 text-center cursor-pointer hover:border-gold/50 hover:bg-gold/5 transition-all">
                <Upload className="w-10 h-10 text-gold/40 mx-auto mb-3" />
                <p className="font-cinzel text-white/60 text-sm mb-1">Cliquez pour importer un CSV ou un fichier Excel exporte en CSV</p>
                <p className="font-cormorant text-white/30 text-sm">UTF-8, separe par des virgules ou des points-virgules</p>
                <input type="file" accept=".csv,.txt" onChange={handleCSVUpload} className="hidden" />
              </label>
              <label className="flex items-center gap-2 px-4 py-3 bg-black/50 border border-gold/20 rounded-lg font-cormorant text-white/80 text-sm">
                <input
                  type="checkbox"
                  checked={csvDryRun}
                  onChange={(e) => setCsvDryRun(e.target.checked)}
                  className="accent-gold"
                />
                Prévisualisation CSV (dry-run): analyser sans appliquer les changements. Décochez pour un import réel.
              </label>
              {uploadResult && (
                <div className={`rounded-lg p-4 border ${uploadResult.failed === 0 ? 'border-green-500/30 bg-green-900/10' : 'border-amber-500/30 bg-amber-900/10'}`}>
                  <p className={`font-cormorant text-base ${uploadResult.failed === 0 ? 'text-green-300' : 'text-amber-300'}`}>
                    {uploadResult.dryRun ? 'Prévisualisation terminée' : 'Import terminé'}: <strong>{uploadResult.inserted}</strong> ajoutés{uploadResult.dryRun && ' (prévu)'}{uploadResult.updated > 0 && <>, <strong>{uploadResult.updated}</strong> doublons ignorés (déjà existants)</>}{uploadResult.csvDuplicatesCollapsed > 0 && `, ${uploadResult.csvDuplicatesCollapsed} doublons fusionnés dans le CSV`}{uploadResult.failed > 0 && `, ${uploadResult.failed} lignes invalides`}. 
                  </p>
                </div>
              )}
              {csvLineReport.length > 0 && (
                <div className="rounded-lg border border-gold/20 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gold/10 bg-black/50">
                    <p className="font-cinzel text-white/75 text-xs tracking-widest uppercase">Rapport détaillé ligne par ligne</p>
                  </div>
                  <div className="max-h-72 overflow-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gold/10 bg-black/40">
                          <th className="px-4 py-2 text-left font-cinzel text-white/40 text-[11px] tracking-widest uppercase">Ligne</th>
                          <th className="px-4 py-2 text-left font-cinzel text-white/40 text-[11px] tracking-widest uppercase">Invité</th>
                          <th className="px-4 py-2 text-left font-cinzel text-white/40 text-[11px] tracking-widest uppercase">Action</th>
                          <th className="px-4 py-2 text-left font-cinzel text-white/40 text-[11px] tracking-widest uppercase">Raison</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvLineReport.map((item, index) => (
                          <tr key={`${item.line}-${item.fullName}-${index}`} className="border-b border-gold/5 align-top">
                            <td className="px-4 py-2 font-cormorant text-white/60 text-sm">{item.line}</td>
                            <td className="px-4 py-2 font-cormorant text-white text-sm">{item.fullName}</td>
                            <td className="px-4 py-2">
                              <span className={`inline-block px-2 py-0.5 rounded border text-xs font-cormorant uppercase ${
                                item.action === 'added'
                                  ? 'text-green-300 border-green-500/40 bg-green-900/20'
                                  : item.action === 'updated'
                                    ? 'text-blue-300 border-blue-500/40 bg-blue-900/20'
                                    : 'text-amber-300 border-amber-500/40 bg-amber-900/20'
                              }`}>
                                {item.action === 'added' ? 'ajoute' : item.action === 'updated' ? 'mis a jour' : 'ignore'}
                              </span>
                            </td>
                            <td className="px-4 py-2 font-cormorant text-white/70 text-sm">{item.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="border border-gold/20 rounded-2xl p-6 md:p-8 backdrop-blur-sm bg-black/40">
              <h3 className="font-cinzel text-white text-lg font-bold mb-1">Ajouter un invité manuellement</h3>
              <p className="font-cormorant text-white/50 text-sm mb-5">
                Créez une fiche complète sans CSV pour les cas individuels ou urgents.
              </p>
            <form onSubmit={handleAddGuest} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-cormorant text-white/60 text-sm tracking-widest uppercase mb-2">Prenom *</label>
                <input
                  type="text"
                  value={newGuest.first_name}
                  onChange={(e) => setNewGuest({ ...newGuest, first_name: e.target.value })}
                  className="w-full bg-black/60 border border-gold/20 rounded-lg px-4 py-3 font-cormorant text-white text-base focus:outline-none focus:border-gold/50 transition-colors"
                  placeholder="Jean"
                />
              </div>
              <div>
                <label className="block font-cormorant text-white/60 text-sm tracking-widest uppercase mb-2">Post-nom <span className="text-white/30">(optionnel)</span></label>
                <input
                  type="text"
                  value={newGuest.post_name}
                  onChange={(e) => setNewGuest({ ...newGuest, post_name: e.target.value })}
                  className="w-full bg-black/60 border border-gold/20 rounded-lg px-4 py-3 font-cormorant text-white text-base focus:outline-none focus:border-gold/50 transition-colors"
                  placeholder="Emmanuel (si applicable)"
                />
              </div>
              <div>
                <label className="block font-cormorant text-white/60 text-sm tracking-widest uppercase mb-2">Nom *</label>
                <input
                  type="text"
                  value={newGuest.last_name}
                  onChange={(e) => setNewGuest({ ...newGuest, last_name: e.target.value })}
                  className="w-full bg-black/60 border border-gold/20 rounded-lg px-4 py-3 font-cormorant text-white text-base focus:outline-none focus:border-gold/50 transition-colors"
                  placeholder="Mukendi"
                />
              </div>
              <div className="">
                <label className="block font-cormorant text-white/60 text-sm tracking-widest uppercase mb-2">Type de Personne</label>
                <select
                  value={newGuest.person_type}
                  onChange={(e) => setNewGuest({ ...newGuest, person_type: e.target.value as PersonType })}
                  className="w-full bg-black/60 border border-gold/20 rounded-lg px-4 py-3 font-cormorant text-white text-base focus:outline-none focus:border-gold/50 transition-colors"
                >
                  <option value="family">Famille</option>
                  <option value="friends">Amis</option>
                  <option value="work">Travail</option>
                </select>
              </div>
              <div className="">
                <label className="block font-cormorant text-white/60 text-sm tracking-widest uppercase mb-2">Sexe *</label>
                <select
                  value={newGuest.gender}
                  onChange={(e) => setNewGuest({ ...newGuest, gender: e.target.value as 'male' | 'female' })}
                  className="w-full bg-black/60 border border-gold/20 rounded-lg px-4 py-3 font-cormorant text-white text-base focus:outline-none focus:border-gold/50 transition-colors"
                >
                  <option value="male">Homme</option>
                  <option value="female">Femme</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block font-cormorant text-white/60 text-sm tracking-widest uppercase mb-2">Téléphone (optionnel)</label>
                <input
                  type="tel"
                  placeholder="+243..."
                  value={newGuest.phone}
                  onChange={(e) => setNewGuest({ ...newGuest, phone: e.target.value })}
                  className="w-full bg-black/60 border border-gold/20 rounded-lg px-4 py-3 font-cormorant text-white text-base placeholder:text-white/25 focus:outline-none focus:border-gold/50 transition-colors"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block font-cormorant text-white/60 text-sm tracking-widest uppercase mb-2">E-mail (optionnel)</label>
                <input
                  type="email"
                  placeholder="exemple@email.com"
                  value={newGuest.email}
                  onChange={(e) => setNewGuest({ ...newGuest, email: e.target.value })}
                  className="w-full bg-black/60 border border-gold/20 rounded-lg px-4 py-3 font-cormorant text-white text-base placeholder:text-white/25 focus:outline-none focus:border-gold/50 transition-colors"
                />
              </div>

              {/* Toggle couple */}
              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={() => setNewGuest({ ...newGuest, is_couple: !newGuest.is_couple })}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all font-cormorant text-base ${
                    newGuest.is_couple
                      ? 'border-gold/60 bg-gold/10 text-gold'
                      : 'border-gold/20 bg-black/40 text-white/60 hover:border-gold/40 hover:text-white/90'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-lg">💑</span>
                    <span className="tracking-wide">Cet invité vient en couple</span>
                  </span>
                  <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    newGuest.is_couple ? 'border-gold bg-gold' : 'border-white/30 bg-transparent'
                  }`}>
                    {newGuest.is_couple && <span className="text-black text-xs font-bold">✓</span>}
                  </span>
                </button>
              </div>

              {newGuest.is_couple && (
                <div className="md:col-span-2 border border-gold/20 rounded-xl px-4 py-3 bg-gold/5">
                  <p className="font-cormorant text-gold/80 text-sm">
                    Mode couple actif: cet invité est enregistré comme représentant du couple.
                  </p>
                </div>
              )}
              <div className="md:col-span-2 flex flex-col gap-3">
                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-gold/80 to-gold hover:from-gold hover:to-amber-400 text-black font-cinzel text-sm font-bold tracking-widest uppercase transition-all duration-300"
                >
                  Ajouter l'invite
                </button>
                {addGuestMessage && (
                  <div className={`px-4 py-3 rounded-lg font-cormorant text-sm text-center transition-all ${
                    !isErrorMessage(addGuestMessage)
                      ? 'bg-green-900/30 border border-green-500/40 text-green-300'
                      : 'bg-red-900/30 border border-red-500/40 text-red-300'
                  }`}>
                    {addGuestMessage}
                  </div>
                )}
              </div>
            </form>
            </div>
          </div>
        )}

        {tab === 'guests' && (
          <div>
            <div className="border border-gold/20 rounded-2xl p-5 md:p-6 backdrop-blur-sm bg-black/40 mb-6">
              <h3 className="font-cinzel text-white text-lg font-bold mb-1">Filtrer et segmenter les invités</h3>
              <p className="font-cormorant text-white/50 text-sm mb-4">
                Définissez d'abord votre cible, puis enchaînez sur l'envoi ciblé ou la mise à jour des contacts.
              </p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3 mb-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher par nom ou type..."
                className="xl:col-span-2 bg-black/50 border border-gold/20 rounded-lg px-4 py-2.5 font-cormorant text-white text-base focus:outline-none focus:border-gold/50 transition-colors placeholder:text-white/25"
              />
              <select
                value={filterPersonType}
                onChange={(e) => setFilterPersonType(e.target.value as PersonType | 'all')}
                className="bg-black/50 border border-gold/20 rounded-lg px-4 py-2.5 font-cormorant text-white text-base focus:outline-none focus:border-gold/50 transition-colors"
              >
                <option value="all">Tous les types</option>
                <option value="family">Famille</option>
                <option value="friends">Amis</option>
                <option value="work">Travail</option>
              </select>
              <select
                value={filterGender}
                onChange={(e) => setFilterGender(e.target.value as GenderFilter)}
                className="bg-black/50 border border-gold/20 rounded-lg px-4 py-2.5 font-cormorant text-white text-base focus:outline-none focus:border-gold/50 transition-colors"
              >
                <option value="all">Tous les genres</option>
                <option value="male">Homme</option>
                <option value="female">Femme</option>
              </select>
              <select
                value={filterInvitationStatus}
                onChange={(e) => setFilterInvitationStatus(e.target.value as InvitationStatusFilter)}
                className="bg-black/50 border border-gold/20 rounded-lg px-4 py-2.5 font-cormorant text-white text-base focus:outline-none focus:border-gold/50 transition-colors"
              >
                <option value="all">Toutes les invitations</option>
                <option value="pending">En attente</option>
                <option value="sent">Envoyée</option>
                <option value="confirmed">Confirmée</option>
              </select>
              <select
                value={filterRsvpStatus}
                onChange={(e) => setFilterRsvpStatus(e.target.value as RSVPStatusFilter)}
                className="bg-black/50 border border-gold/20 rounded-lg px-4 py-2.5 font-cormorant text-white text-base focus:outline-none focus:border-gold/50 transition-colors"
              >
                <option value="all">Tous les RSVP</option>
                <option value="pending">{rsvpStatusLabel('pending')}</option>
                <option value="attending">{rsvpStatusLabel('attending')}</option>
                <option value="not_attending">{rsvpStatusLabel('not_attending')}</option>
                <option value="maybe">{rsvpStatusLabel('maybe')}</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 mb-6">
              <select
                value={filterGuestsCount}
                onChange={(e) => setFilterGuestsCount(e.target.value as GuestsCountFilter)}
                className="bg-black/50 border border-gold/20 rounded-lg px-4 py-2.5 font-cormorant text-white text-base focus:outline-none focus:border-gold/50 transition-colors"
              >
                <option value="all">Tous les nombres d'invités</option>
                <option value="solo">1 invité</option>
                <option value="pair">2 invités</option>
                <option value="group">3 invités ou plus</option>
                <option value="couple">Couples uniquement</option>
              </select>
              <button
                type="button"
                onClick={resetGuestFilters}
                className="px-4 py-2.5 border border-gold/20 rounded-lg text-white/60 hover:text-gold hover:border-gold/40 transition-all font-cormorant text-sm"
              >
                Réinitialiser les filtres
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
              {[
                { label: 'Visibles', value: filteredStats.total },
                { label: 'Pers. visibles', value: filteredStats.people },
                { label: 'Famille', value: filteredStats.family },
                { label: 'Amis', value: filteredStats.friends },
                { label: 'Travail', value: filteredStats.work },
                { label: 'Couples', value: filteredStats.couples },
              ].map((item) => (
                <div key={item.label} className="border border-gold/10 rounded-lg px-4 py-3 bg-black/30">
                  <p className="font-cormorant text-white/45 text-xs tracking-widest uppercase">{item.label}</p>
                  <p className="font-cinzel text-xl text-white mt-1">{item.value}</p>
                </div>
              ))}
            </div>
            </div>

            <div id="admin-invitations-center" className="border border-gold/20 rounded-2xl p-5 md:p-6 backdrop-blur-sm bg-black/40 mb-6 scroll-mt-28">
              <button
                type="button"
                onClick={() => toggleSection('invitations')}
                className="w-full flex items-center justify-between group hover:text-gold transition-colors"
              >
                <h3 className="font-cinzel text-white text-lg font-bold">Centre d'envoi des invitations</h3>
                <div className="flex items-center gap-2">
                  <span className="font-cormorant text-white/60 text-sm">
                    {collapsedSections.invitations ? 'Afficher' : 'Masquer'}
                  </span>
                  {collapsedSections.invitations ? (
                    <ChevronDown className="w-5 h-5 text-white/50 group-hover:text-gold" />
                  ) : (
                    <ChevronUp className="w-5 h-5 text-white/50 group-hover:text-gold" />
                  )}
                </div>
              </button>
              {!collapsedSections.invitations && (
                <p className="font-cormorant text-white/50 text-sm mt-1 mb-5">
                  Tout est regroupé ici: envoi global et envoi ciblé, avec les mêmes filtres invités appliqués au-dessus.
                </p>
              )}

              {!collapsedSections.invitations && (
                <>
              <div className="rounded-xl border border-gold/20 bg-black/35 p-4 md:p-5 mb-5">
                <p className="font-cinzel text-white text-xs tracking-widest uppercase mb-2">Canaux d'envoi (commun)</p>
                <p className="font-cormorant text-white/55 text-sm mb-3">
                  Choisissez ici les canaux à utiliser pour les envois global et ciblé.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-center">
                  <select
                    value={invitationChannelCombo}
                    onChange={(e) => setInvitationChannelCombo(e.target.value as InvitationChannelCombo)}
                    className="bg-black/60 border border-gold/20 rounded-lg px-4 py-2.5 font-cormorant text-white text-base focus:outline-none focus:border-gold/50 transition-colors"
                  >
                    <option value="sms">SMS</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">E-mail</option>
                    <option value="sms_whatsapp">SMS + WhatsApp</option>
                    <option value="sms_email">SMS + E-mail</option>
                    <option value="whatsapp_email">WhatsApp + E-mail</option>
                    <option value="sms_whatsapp_email">SMS + WhatsApp + E-mail</option>
                  </select>
                  <div className="flex items-center gap-2 text-white/50 font-cormorant text-sm">
                    {channelHasSms && <span className="px-2 py-1 rounded border border-amber-500/40 text-amber-200 text-xs">SMS</span>}
                    {channelHasWhatsapp && <span className="px-2 py-1 rounded border border-green-500/40 text-green-200 text-xs">WhatsApp</span>}
                    {channelHasEmail && <span className="px-2 py-1 rounded border border-blue-500/40 text-blue-200 text-xs">E-mail</span>}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gold/15 bg-black/30 p-4 md:p-5 mb-5">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div>
                    <h4 className="font-cinzel text-white text-sm tracking-widest uppercase">Envoi global (1 clic)</h4>
                    <p className="font-cormorant text-white/55 text-sm mt-1">
                      Envoie à tous les invités qui correspondent aux filtres ci-dessous.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
                  <select
                    value={bulkRsvpFilter}
                    onChange={(e) => setBulkRsvpFilter(e.target.value as BulkRsvpFilter)}
                    className="bg-black/60 border border-gold/20 rounded-lg px-4 py-2.5 font-cormorant text-white text-base focus:outline-none focus:border-gold/50 transition-colors"
                  >
                    <option value="all">Tous les RSVP</option>
                    <option value="pending">En attente</option>
                    <option value="attending">Présents</option>
                    <option value="not_attending">Absents</option>
                    <option value="maybe">Peut-être</option>
                  </select>

                  <select
                    value={bulkTypeFilter}
                    onChange={(e) => setBulkTypeFilter(e.target.value as BulkTypeFilter)}
                    className="bg-black/60 border border-gold/20 rounded-lg px-4 py-2.5 font-cormorant text-white text-base focus:outline-none focus:border-gold/50 transition-colors"
                  >
                    <option value="all">Tous les types</option>
                    <option value="family">Famille</option>
                    <option value="friends">Amis</option>
                    <option value="work">Travail</option>
                  </select>

                  <select
                    value={bulkCoupleFilter}
                    onChange={(e) => setBulkCoupleFilter(e.target.value as BulkCoupleFilter)}
                    className="bg-black/60 border border-gold/20 rounded-lg px-4 py-2.5 font-cormorant text-white text-base focus:outline-none focus:border-gold/50 transition-colors"
                  >
                    <option value="all">Tous (couple/non couple)</option>
                    <option value="couple">Couples uniquement</option>
                    <option value="not_couple">Non-couples uniquement</option>
                  </select>

                  <label className="flex items-center gap-2 px-4 py-2.5 bg-black/50 border border-gold/30 rounded-lg font-cormorant text-white/90 text-sm">
                    <input
                      type="checkbox"
                      checked={bulkDryRun}
                      onChange={(e) => setBulkDryRun(e.target.checked)}
                      className="accent-gold"
                    />
                    Dry run (simulation)
                  </label>

                  <div className="px-4 py-2.5 bg-black/50 border border-gold/20 rounded-lg font-cormorant text-white/80 text-sm flex items-center">
                    Canaux actifs: {invitationComboLabel(invitationChannelCombo)}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={sendBulkNotifications}
                    disabled={bulkSending}
                    className="px-5 py-3 rounded-xl bg-gradient-to-r from-gold/80 to-gold hover:from-gold hover:to-amber-400 text-black font-cinzel text-xs font-bold tracking-widest uppercase transition-all disabled:opacity-50"
                  >
                    {bulkSending ? 'Traitement...' : bulkDryRun ? 'Lancer Dry Run' : 'Envoyer à tous les invités ciblés'}
                  </button>
                  <button
                    type="button"
                    onClick={runBulkDiagnostics}
                    disabled={bulkDiagLoading}
                    className="px-4 py-3 rounded-xl border border-gold/30 text-gold hover:bg-gold/10 font-cinzel text-[11px] tracking-widest uppercase transition-all disabled:opacity-50"
                  >
                    {bulkDiagLoading ? 'Diagnostic...' : 'Diagnostiquer connexion'}
                  </button>
                </div>

                {bulkDiagResult && (
                  <div className="mt-3 rounded-lg px-4 py-3 border border-blue-500/40 bg-blue-900/20 text-blue-200 font-cormorant text-sm">
                    {bulkDiagResult}
                  </div>
                )}

                {bulkResult && (
                  <div className={`mt-4 rounded-lg px-4 py-3 border font-cormorant text-sm ${isErrorMessage(bulkResult) ? 'border-red-500/40 bg-red-900/20 text-red-300' : 'border-green-500/40 bg-green-900/20 text-green-300'}`}>
                    {bulkResult}
                  </div>
                )}

                {bulkDetails.length > 0 && (
                  <div className="mt-4 border border-gold/15 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-gold/10 bg-black/60">
                      <p className="font-cinzel text-white/80 text-xs tracking-widest uppercase">Rapport global par invité</p>
                    </div>
                    <div className="max-h-72 overflow-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gold/10 bg-black/30">
                            <th className="px-4 py-2 text-left font-cinzel text-white/40 text-[11px] tracking-widest uppercase">Invité</th>
                            <th className="px-4 py-2 text-left font-cinzel text-white/40 text-[11px] tracking-widest uppercase">SMS</th>
                            <th className="px-4 py-2 text-left font-cinzel text-white/40 text-[11px] tracking-widest uppercase">E-mail</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bulkDetails.map((item, index) => (
                            <tr key={`${item.guest_id}-${index}`} className="border-b border-gold/5 align-top">
                              <td className="px-4 py-3 font-cormorant text-white text-sm">{item.guest_name || 'Invité inconnu'}</td>
                              <td className="px-4 py-3">
                                {item.sms ? (
                                  <div>
                                    <span className={`inline-block px-2 py-0.5 rounded border text-xs font-cormorant uppercase ${statusClasses(item.sms.status)}`}>
                                      {statusLabel(item.sms.status, 'sms')}
                                    </span>
                                    <p className="font-cormorant text-white/45 text-xs mt-1 break-all">{item.sms.target || '-'}</p>
                                    {item.sms.reason && <p className="font-cormorant text-red-300/80 text-xs mt-1">{item.sms.reason}</p>}
                                  </div>
                                ) : (
                                  <span className="font-cormorant text-white/35 text-xs">N/D</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {item.email ? (
                                  <div>
                                    <span className={`inline-block px-2 py-0.5 rounded border text-xs font-cormorant uppercase ${statusClasses(item.email.status)}`}>
                                      {statusLabel(item.email.status, 'email')}
                                    </span>
                                    <p className="font-cormorant text-white/45 text-xs mt-1 break-all">{item.email.target || '-'}</p>
                                    {item.email.reason && <p className="font-cormorant text-red-300/80 text-xs mt-1">{item.email.reason}</p>}
                                  </div>
                                ) : (
                                  <span className="font-cormorant text-white/35 text-xs">N/D</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-gold/15 bg-black/30 p-4 md:p-5">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div>
                    <h4 className="font-cinzel text-white text-sm tracking-widest uppercase">Envoi ciblé d'invitations</h4>
                    <p className="font-cormorant text-white/55 text-sm mt-1">
                      Sélectionnez un ou plusieurs invités, puis envoyez avec la combinaison de canaux choisie.
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-cinzel text-[11px] tracking-widest uppercase text-gold/80">Invités sélectionnés</p>
                    <p className="font-cinzel text-2xl text-gold mt-1">{selectedGuestIds.length}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                  <label className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gold/20 to-amber-200/20 border border-gold/45 rounded-lg font-cormorant text-amber-100 text-sm shadow-[0_0_0_1px_rgba(255,215,0,0.08)]">
                    <input
                      type="checkbox"
                      checked={directInviteDryRun}
                      onChange={(e) => setDirectInviteDryRun(e.target.checked)}
                      className="accent-gold"
                    />
                    Dry run (simulation)
                  </label>

                  <button
                    type="button"
                    onClick={() => toggleSelectAllFilteredGuests(!allFilteredGuestsSelected)}
                    className="px-4 py-2.5 border border-gold/20 rounded-lg text-white/70 hover:text-gold hover:border-gold/40 transition-all font-cormorant text-sm"
                  >
                    {allFilteredGuestsSelected ? 'Désélectionner les visibles' : 'Sélectionner les visibles'}
                  </button>

                  <button
                    type="button"
                    onClick={clearSelectedGuests}
                    disabled={selectedGuestIds.length === 0}
                    className="px-4 py-2.5 border border-gold/20 rounded-lg text-white/70 hover:text-gold hover:border-gold/40 transition-all font-cormorant text-sm disabled:opacity-40"
                  >
                    Vider la sélection
                  </button>

                  <div className="px-4 py-2.5 bg-black/50 border border-gold/20 rounded-lg font-cormorant text-white/80 text-sm flex items-center">
                    Canaux actifs: {invitationComboLabel(invitationChannelCombo)}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={sendDirectInvitations}
                    disabled={directInviteSending || selectedGuestIds.length === 0}
                    className="px-5 py-3 rounded-xl bg-gradient-to-r from-gold/80 to-gold hover:from-gold hover:to-amber-400 text-black font-cinzel text-xs font-bold tracking-widest uppercase transition-all disabled:opacity-50"
                  >
                    {directInviteSending
                      ? 'Traitement...'
                      : directInviteDryRun
                        ? `Dry Run (${selectedGuestIds.length})`
                        : `Envoyer (${selectedGuestIds.length})`}
                  </button>

                  <div className="flex items-center gap-2 text-white/45 font-cormorant text-sm">
                    {channelHasWhatsapp && <MessageCircle className="w-4 h-4 text-green-400/80" />}
                    {channelHasEmail && <Mail className="w-4 h-4 text-blue-300/80" />}
                    {channelHasSms && <span className="inline-flex items-center px-2 py-0.5 rounded border border-amber-500/40 text-amber-200 text-xs">SMS</span>}
                    <span>Canaux actifs selon le mode choisi</span>
                  </div>
                </div>

                {directInviteResult && (
                  <div className={`mt-4 rounded-lg px-4 py-3 border font-cormorant text-sm ${isErrorMessage(directInviteResult) ? 'border-red-500/40 bg-red-900/20 text-red-300' : 'border-green-500/40 bg-green-900/20 text-green-300'}`}>
                    {directInviteResult}
                  </div>
                )}

                {directInviteDetails.length > 0 && (
                  <div className="mt-4 border border-gold/15 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-gold/10 bg-black/60">
                      <p className="font-cinzel text-white/80 text-xs tracking-widest uppercase">Rapport ciblé par invité</p>
                    </div>
                    <div className="max-h-72 overflow-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gold/10 bg-black/30">
                            <th className="px-4 py-2 text-left font-cinzel text-white/40 text-[11px] tracking-widest uppercase">Invité</th>
                            <th className="px-4 py-2 text-left font-cinzel text-white/40 text-[11px] tracking-widest uppercase">WhatsApp</th>
                            <th className="px-4 py-2 text-left font-cinzel text-white/40 text-[11px] tracking-widest uppercase">E-mail</th>
                          </tr>
                        </thead>
                        <tbody>
                          {directInviteDetails.map((item, index) => (
                            <tr key={`${item.guest_id}-${index}`} className="border-b border-gold/5 align-top">
                              <td className="px-4 py-3 font-cormorant text-white text-sm">{item.guest_name || 'Invité inconnu'}</td>
                              <td className="px-4 py-3">
                                {item.whatsapp ? (
                                  <div>
                                    <span className={`inline-block px-2 py-0.5 rounded border text-xs font-cormorant uppercase ${statusClasses(item.whatsapp.status)}`}>
                                      {statusLabel(item.whatsapp.status, 'whatsapp')}
                                    </span>
                                    <p className="font-cormorant text-white/45 text-xs mt-1 break-all">{item.whatsapp.target || '-'}</p>
                                    {item.whatsapp.reason && <p className="font-cormorant text-red-300/80 text-xs mt-1">{item.whatsapp.reason}</p>}
                                  </div>
                                ) : (
                                  <span className="font-cormorant text-white/35 text-xs">N/D</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {item.email ? (
                                  <div>
                                    <span className={`inline-block px-2 py-0.5 rounded border text-xs font-cormorant uppercase ${statusClasses(item.email.status)}`}>
                                      {statusLabel(item.email.status, 'email')}
                                    </span>
                                    <p className="font-cormorant text-white/45 text-xs mt-1 break-all">{item.email.target || '-'}</p>
                                    {item.email.reason && <p className="font-cormorant text-red-300/80 text-xs mt-1">{item.email.reason}</p>}
                                  </div>
                                ) : (
                                  <span className="font-cormorant text-white/35 text-xs">N/D</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
              </>
              )}
            </div>

            <div id="admin-guests-table" className="border border-gold/20 rounded-2xl p-5 md:p-6 backdrop-blur-sm bg-black/40 scroll-mt-28">
              <h3 className="font-cinzel text-white text-lg font-bold mb-1">Table de gestion des invités</h3>
              <p className="font-cormorant text-white/50 text-sm mb-4">
                Modifiez les contacts, le RSVP, sélectionnez les personnes et supprimez les fiches obsolètes.
              </p>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="font-cormorant text-white/45 text-sm">
                  Affichage {compactGuestTable ? 'compact' : 'standard'}.
                </p>
                <button
                  type="button"
                  onClick={() => setCompactGuestTable((prev) => !prev)}
                  className="px-4 py-2 border border-gold/20 rounded-lg text-white/70 hover:text-gold hover:border-gold/40 transition-all font-cormorant text-sm"
                >
                  {compactGuestTable ? 'Mode standard' : 'Mode compact'}
                </button>
              </div>
            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="w-8 h-8 text-gold/40 animate-spin mx-auto" />
              </div>
            ) : (
              <div className="border border-gold/15 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className={`w-full ${compactGuestTable ? 'text-[12px]' : ''}`}>
                    <thead>
                      <tr className="border-b border-gold/15 bg-black/60">
                        {['Sélection', 'Nom complet', 'Couple', 'Type', 'Sexe', 'Téléphone', 'E-mail', 'Invitation', 'Statut RSVP', 'Invités', 'Téléchargements', 'Actions'].map((h) => (
                          <th
                            key={h}
                            className={`${guestTableHeaderCellClass} font-cinzel text-white/40 text-xs tracking-widest uppercase align-middle ${
                              ['Sélection', 'Couple', 'Type', 'Sexe', 'Invitation', 'Statut RSVP', 'Invités', 'Téléchargements', 'Actions'].includes(h)
                                ? 'text-center'
                                : 'text-left'
                            }`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredGuests.map((g, i) => (
                        <tr
                          key={g.id}
                          className={`border-b border-gold/8 ${i % 2 === 0 ? 'bg-black/30' : 'bg-black/10'} hover:bg-gold/5 transition-colors`}
                        >
                          <td className={`${guestTableCellClass} align-middle text-center`}>
                            <input
                              type="checkbox"
                              checked={selectedGuestIds.includes(g.id)}
                              onChange={(e) => toggleGuestSelection(g.id, e.target.checked)}
                              className="accent-gold"
                              aria-label={`Sélectionner ${g.first_name} ${g.last_name}`}
                            />
                          </td>
                          <td className={guestTableCellClass}>
                            <p className={`font-cormorant text-white font-semibold ${compactGuestTable ? 'text-xs' : 'text-sm'}`}>
                              {g.first_name} {g.post_name ? g.post_name + ' ' : ''}{g.last_name}
                            </p>
                            {g.is_couple && (
                              <div className="mt-0.5 flex items-center gap-1.5">
                                <span className="text-[10px] px-1.5 py-0.5 rounded border border-pink-400/40 text-pink-300 bg-pink-900/20 font-cinzel tracking-wide">💑 Couple</span>
                              </div>
                            )}
                          </td>
                          <td className={`${guestTableCellClass} align-middle text-center`}>
                            <select
                              value={String(contactEdits[g.id]?.is_couple ?? g.is_couple)}
                              onChange={(e) =>
                                setContactEdits((prev) => ({
                                  ...prev,
                                  [g.id]: {
                                    phone: prev[g.id]?.phone ?? g.phone ?? g.rsvp_contact_phone ?? '',
                                    email: prev[g.id]?.email ?? g.rsvp_contact_email ?? '',
                                    is_couple: e.target.value === 'true',
                                  },
                                }))
                              }
                              className="bg-black/40 border border-gold/20 rounded px-2 py-1 font-cormorant text-white text-xs focus:outline-none focus:border-gold/50"
                            >
                              <option value="false">Non</option>
                              <option value="true">Oui</option>
                            </select>
                          </td>
                          <td className={`${guestTableCellClass} align-middle text-center`}>
                            <span className="px-2 py-0.5 rounded text-xs border font-cormorant bg-gold/10 text-gold border-gold/20 uppercase">
                              {personTypeLabel(normalizePersonType(g.person_type, g.group_name))}
                            </span>
                          </td>
                          <td className={`${guestTableCellClass} align-middle text-center`}>
                            <span className={`font-cormorant text-white/70 ${compactGuestTable ? 'text-xs' : 'text-sm'}`}>{genderLabel(g.gender)}</span>
                          </td>
                          <td className={guestTableCellClass}>
                            <input
                              type="text"
                              value={contactEdits[g.id]?.phone ?? (g.phone || g.rsvp_contact_phone || '')}
                              onChange={(e) =>
                                setContactEdits((prev) => ({
                                  ...prev,
                                  [g.id]: {
                                    phone: e.target.value,
                                    email: prev[g.id]?.email ?? g.rsvp_contact_email ?? '',
                                    is_couple: prev[g.id]?.is_couple ?? g.is_couple,
                                  },
                                }))
                              }
                              className="w-full min-w-[150px] bg-black/40 border border-gold/20 rounded px-2 py-1 font-cormorant text-white text-sm focus:outline-none focus:border-gold/50"
                              placeholder="+243..."
                            />
                          </td>
                          <td className={guestTableCellClass}>
                            <input
                              type="email"
                              value={contactEdits[g.id]?.email ?? (g.rsvp_contact_email || '')}
                              onChange={(e) =>
                                setContactEdits((prev) => ({
                                  ...prev,
                                  [g.id]: {
                                    phone: prev[g.id]?.phone ?? g.phone ?? g.rsvp_contact_phone ?? '',
                                    email: e.target.value,
                                    is_couple: prev[g.id]?.is_couple ?? g.is_couple,
                                  },
                                }))
                              }
                              className="w-full min-w-[180px] bg-black/40 border border-gold/20 rounded px-2 py-1 font-cormorant text-white text-sm focus:outline-none focus:border-gold/50"
                              placeholder="email@exemple.com"
                            />
                          </td>
                          <td className={`${guestTableCellClass} align-middle text-center`}>
                            <span className={`px-2 py-0.5 rounded text-xs border font-cormorant ${
                              g.invitation_status === 'confirmed'
                                ? 'bg-green-900/30 text-green-400 border-green-500/30'
                                : g.invitation_status === 'sent'
                                ? 'bg-blue-900/30 text-blue-400 border-blue-500/30'
                                : 'bg-white/5 text-white/40 border-white/10'
                            }`}>
                              {invitationStatusLabel(g.invitation_status)}
                            </span>
                          </td>
                          <td className={`${guestTableCellClass} align-middle text-center`}>
                            <select
                              value={g.rsvp_status}
                              onChange={(e) => updateRSVP(g.id, e.target.value as Guest['rsvp_status'])}
                              className={`px-2 py-1 rounded border text-xs font-cormorant bg-black/40 cursor-pointer focus:outline-none ${rsvpBadge(g.rsvp_status)}`}
                            >
                              <option value="pending">{rsvpStatusLabel('pending')}</option>
                              <option value="attending">{rsvpStatusLabel('attending')}</option>
                              <option value="not_attending">{rsvpStatusLabel('not_attending')}</option>
                              <option value="maybe">{rsvpStatusLabel('maybe')}</option>
                            </select>
                          </td>
                          <td className={`${guestTableCellClass} align-middle text-center`}>
                            <span className={`font-cormorant text-white/45 ${compactGuestTable ? 'text-xs' : 'text-sm'}`}>{g.number_of_guests}</span>
                          </td>
                          <td className={`${guestTableCellClass} align-middle text-center`}>
                            <span className={`font-cormorant text-gold/80 font-semibold ${compactGuestTable ? 'text-xs' : 'text-sm'}`}>{g.download_count ?? 0}</span>
                          </td>
                          <td className={`${guestTableCellClass} align-middle`}>
                            <div className="flex items-center justify-center gap-3">
                              <button
                                onClick={() => updateGuestContact(g)}
                                disabled={savingContactId === g.id}
                                className="px-2 py-1 rounded border border-gold/20 text-white/70 hover:text-gold hover:border-gold/40 transition-colors font-cormorant text-xs disabled:opacity-50"
                              >
                                {savingContactId === g.id ? 'Enregistrement...' : 'Enregistrer'}
                              </button>
                              <button
                                onClick={() => deleteGuest(g.id)}
                                className="text-red-400/40 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredGuests.length === 0 && (
                        <tr>
                          <td colSpan={12} className="text-center py-10 font-cormorant text-white/30 text-base">
                            Aucun invite trouve.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            </div>
          </div>
        )}
          </AdminSectionCard>
        </div>
      </div>
    </section>
  );
}
