#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║           GESTIONNAIRE DE BASE DE DONNÉES               ║
 * ║         Protection · Sauvegarde · Synchronisation       ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * COMMANDES:
 *   node db-manager.js backup          → Créer une sauvegarde maintenant
 *   node db-manager.js sync            → Synchroniser (ne supprime JAMAIS)
 *   node db-manager.js list            → Lister les sauvegardes disponibles
 *   node db-manager.js restore <N>     → Restaurer la sauvegarde N (ex: restore 1)
 *   node db-manager.js status          → Voir l'état de la base de données
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKUP_DIR = path.join(__dirname, 'backups');
const MAX_BACKUPS = 20; // Garder les 20 dernières sauvegardes

// ─── Chargement des variables d'environnement ─────────────────────────────
function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const envPath = path.join(__dirname, file);
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      content.split('\n').forEach(line => {
        const eqIndex = line.indexOf('=');
        if (eqIndex > 0) {
          const key = line.slice(0, eqIndex).trim();
          const value = line.slice(eqIndex + 1).trim();
          if (key && value && !process.env[key]) {
            process.env[key] = value;
          }
        }
      });
      break;
    }
  }
}

loadEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY introuvables dans .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Utilitaires ──────────────────────────────────────────────────────────
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function formatDate(isoStr) {
  return new Date(isoStr.replace(/-/g, (m, offset) => offset < 10 ? '-' : offset < 13 ? 'T' : ':')).toLocaleString('fr-FR');
}

function listBackupFiles() {
  ensureBackupDir();
  return fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.json'))
    .sort()
    .reverse(); // Plus récent en premier
}

function purgeOldBackups() {
  const files = listBackupFiles();
  if (files.length > MAX_BACKUPS) {
    const toDelete = files.slice(MAX_BACKUPS);
    toDelete.forEach(f => {
      fs.unlinkSync(path.join(BACKUP_DIR, f));
    });
    console.log(`🗑️  ${toDelete.length} ancienne(s) sauvegarde(s) supprimée(s) (limite: ${MAX_BACKUPS})`);
  }
}

// ─── Récupérer tous les invités depuis Supabase ───────────────────────────
async function fetchAllGuests() {
  const { data, error } = await supabase
    .from('guests')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Supabase: ${error.message}`);
  return data || [];
}

// ─── COMMANDE: backup ─────────────────────────────────────────────────────
async function cmdBackup(label = '') {
  console.log('\n💾 Création de la sauvegarde...');
  ensureBackupDir();

  const guests = await fetchAllGuests();
  if (guests.length === 0) {
    console.warn('⚠️  Aucun invité trouvé — sauvegarde vide non créée.');
    return null;
  }

  const suffix = label ? `-${label.replace(/[^a-z0-9]/gi, '_')}` : '';
  const filename = `backup-${timestamp()}${suffix}.json`;
  const filepath = path.join(BACKUP_DIR, filename);

  const meta = {
    created_at: new Date().toISOString(),
    count: guests.length,
    source: supabaseUrl,
    guests,
  };

  fs.writeFileSync(filepath, JSON.stringify(meta, null, 2), 'utf-8');
  purgeOldBackups();

  console.log(`✅ Sauvegarde créée: ${filename}`);
  console.log(`   ${guests.length} invités sauvegardés`);
  console.log(`   Fichier: ${filepath}\n`);
  return filepath;
}

// ─── COMMANDE: list ───────────────────────────────────────────────────────
function cmdList() {
  const files = listBackupFiles();
  if (files.length === 0) {
    console.log('\nAucune sauvegarde trouvée. Lancez: node db-manager.js backup\n');
    return;
  }

  console.log(`\n📦 ${files.length} sauvegarde(s) disponible(s):\n`);
  files.forEach((file, index) => {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, file), 'utf-8'));
      const date = data.created_at ? new Date(data.created_at).toLocaleString('fr-FR') : '?';
      console.log(`  [${index + 1}] ${file}`);
      console.log(`       📅 ${date}  |  👥 ${data.count ?? '?'} invités`);
    } catch {
      console.log(`  [${index + 1}] ${file}  (fichier illisible)`);
    }
  });
  console.log(`\nPour restaurer: node db-manager.js restore <numéro>\n`);
}

// ─── COMMANDE: restore ────────────────────────────────────────────────────
async function cmdRestore(indexArg) {
  const files = listBackupFiles();
  if (files.length === 0) {
    console.error('❌ Aucune sauvegarde disponible.');
    return;
  }

  const index = parseInt(indexArg, 10) - 1;
  if (isNaN(index) || index < 0 || index >= files.length) {
    console.error(`❌ Numéro invalide. Choisissez entre 1 et ${files.length}.`);
    cmdList();
    return;
  }

  const file = files[index];
  const filepath = path.join(BACKUP_DIR, file);
  console.log(`\n🔄 Restauration depuis: ${file}`);

  let data;
  try {
    data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  } catch {
    console.error('❌ Impossible de lire le fichier de sauvegarde.');
    return;
  }

  const guests = data.guests || data; // supporte ancien et nouveau format
  if (!Array.isArray(guests) || guests.length === 0) {
    console.error('❌ Sauvegarde vide ou invalide.');
    return;
  }

  // Sauvegarde de sécurité AVANT restauration
  console.log('💾 Sauvegarde de sécurité avant restauration...');
  await cmdBackup('avant-restauration');

  console.log(`📤 Restauration de ${guests.length} invités...`);
  let success = 0, errors = 0;

  for (const guest of guests) {
    const { id, created_at, updated_at, ...guestData } = guest;

    const { data: existing } = await supabase
      .from('guests')
      .select('id')
      .eq('id', id)
      .single();

    let err;
    if (existing) {
      ({ error: err } = await supabase.from('guests').update(guestData).eq('id', id));
    } else {
      ({ error: err } = await supabase.from('guests').insert([{ id, ...guestData }]));
    }

    if (err) {
      errors++;
      console.log(`  ❌ ${guest.first_name} ${guest.last_name}: ${err.message}`);
    } else {
      success++;
    }
  }

  console.log(`\n📊 Résultat: ✅ ${success} restaurés  ❌ ${errors} erreurs`);
  if (errors === 0) console.log('🎉 Restauration terminée avec succès!\n');
}

// ─── COMMANDE: status ─────────────────────────────────────────────────────
async function cmdStatus() {
  console.log('\n📊 État de la base de données...\n');
  const guests = await fetchAllGuests();

  const byType = {};
  const byRsvp = {};
  const byInvitation = {};

  guests.forEach(g => {
    byType[g.person_type || 'inconnu'] = (byType[g.person_type || 'inconnu'] || 0) + 1;
    byRsvp[g.rsvp_status || 'inconnu'] = (byRsvp[g.rsvp_status || 'inconnu'] || 0) + 1;
    byInvitation[g.invitation_status || 'inconnu'] = (byInvitation[g.invitation_status || 'inconnu'] || 0) + 1;
  });

  console.log(`👥 Total invités: ${guests.length}`);
  console.log(`\n📂 Par type:`);
  Object.entries(byType).forEach(([k, v]) => console.log(`   ${k}: ${v}`));
  console.log(`\n📬 Par statut RSVP:`);
  Object.entries(byRsvp).forEach(([k, v]) => console.log(`   ${k}: ${v}`));
  console.log(`\n✉️  Par statut invitation:`);
  Object.entries(byInvitation).forEach(([k, v]) => console.log(`   ${k}: ${v}`));

  const backups = listBackupFiles();
  console.log(`\n💾 Sauvegardes disponibles: ${backups.length}`);
  if (backups.length > 0) {
    const latest = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, backups[0]), 'utf-8'));
    console.log(`   Dernière: ${new Date(latest.created_at).toLocaleString('fr-FR')} (${latest.count} invités)`);
  }
  console.log();
}

// ─── COMMANDE: sync ───────────────────────────────────────────────────────
async function cmdSync() {
  console.log('\n🔄 Synchronisation sûre (ne supprime JAMAIS)...\n');

  // 1. Sauvegarde automatique avant tout
  console.log('💾 Étape 1/3 — Sauvegarde automatique avant sync...');
  await cmdBackup('avant-sync');

  // 2. Récupérer l'état actuel
  console.log('📥 Étape 2/3 — Vérification de la base...');
  const guests = await fetchAllGuests();
  console.log(`   ${guests.length} invités actuellement dans la base\n`);

  // 3. Vérifier l'intégrité
  console.log('🛡️  Étape 3/3 — Vérification de l\'intégrité...');
  const withoutName = guests.filter(g => !g.first_name && !g.last_name);
  const withPhone = guests.filter(g => g.phone);
  const withEmail = guests.filter(g => g.rsvp_contact_email || g.email);

  if (withoutName.length > 0) {
    console.log(`   ⚠️  ${withoutName.length} invité(s) sans nom détectés`);
  } else {
    console.log(`   ✅ Tous les invités ont un nom`);
  }
  console.log(`   📞 ${withPhone.length}/${guests.length} invités avec téléphone`);
  console.log(`   📧 ${withEmail.length}/${guests.length} invités avec email`);

  console.log('\n✨ Synchronisation terminée! Base de données protégée.');
  console.log(`💡 Prochaine sauvegarde recommandée: node db-manager.js backup\n`);
}

// ─── Point d'entrée ───────────────────────────────────────────────────────
const [,, command, ...args] = process.argv;

(async () => {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║      GESTIONNAIRE BASE DE DONNÉES            ║');
  console.log('╚══════════════════════════════════════════════╝');

  try {
    switch (command) {
      case 'backup':
        await cmdBackup(args[0]);
        break;
      case 'list':
        cmdList();
        break;
      case 'restore':
        await cmdRestore(args[0]);
        break;
      case 'status':
        await cmdStatus();
        break;
      case 'sync':
        await cmdSync();
        break;
      default:
        console.log(`
COMMANDES DISPONIBLES:

  node db-manager.js backup          Créer une sauvegarde maintenant
  node db-manager.js sync            Synchroniser et protéger (ne supprime jamais)
  node db-manager.js list            Lister les sauvegardes disponibles
  node db-manager.js restore <N>     Restaurer la sauvegarde numéro N
  node db-manager.js status          Voir l'état de la base de données

EXEMPLES:
  node db-manager.js backup
  node db-manager.js restore 1       (restaure la plus récente)
  node db-manager.js restore 3       (restaure la 3ème)
`);
    }
  } catch (err) {
    console.error(`\n❌ Erreur: ${err.message}\n`);
    process.exit(1);
  }
})();
