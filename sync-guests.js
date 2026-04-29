#!/usr/bin/env node

/**
 * Script de synchronisation sûre des invités depuis Supabase (production)
 * vers la version locale
 * 
 * Utilisation: node sync-guests.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Charger les variables d'environnement depuis .env.local
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

// Charger les variables d'environnement
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Erreur: Variables d\'environnement Supabase non trouvées');
  console.error('Assurez-vous que .env.local contient VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  try {
    console.log('🔄 Début de la synchronisation...\n');

    // Étape 1: Récupérer les invités de Supabase
    console.log('📥 Récupération des invités depuis Supabase...');
    const { data: guests, error } = await supabase
      .from('guests')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('❌ Erreur lors de la récupération:', error.message);
      process.exit(1);
    }

    console.log(`✅ ${guests.length} invités récupérés\n`);

    if (guests.length === 0) {
      console.warn('⚠️  Aucun invité trouvé dans Supabase');
      process.exit(0);
    }

    // Étape 2: Créer un backup des données actuelles (si elles existent)
    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `guests-backup-${timestamp}.json`);
    
    console.log('💾 Création d\'un backup de sécurité...');
    fs.writeFileSync(backupFile, JSON.stringify(guests, null, 2));
    console.log(`✅ Backup créé: ${backupFile}\n`);

    // Étape 3: Exporter en CSV pour import manuel
    const csvFile = path.join(__dirname, 'guests-export.csv');
    const csv = exportToCsv(guests);
    fs.writeFileSync(csvFile, csv);
    console.log(`📄 CSV exporté: ${csvFile}\n`);

    // Étape 4: Afficher un résumé
    console.log('📊 Résumé de la synchronisation:');
    console.log(`   - Total invités: ${guests.length}`);
    console.log(`   - Backup JSON: ${backupFile}`);
    console.log(`   - CSV d'import: ${csvFile}\n`);

    console.log('✨ Synchronisation terminée avec succès!');
    console.log('\n📋 Prochaines étapes:');
    console.log('   1. Allez dans Admin > Import CSV');
    console.log(`   2. Sélectionnez le fichier: ${csvFile}`);
    console.log('   3. Importez les données');
    console.log('   4. Vérifiez que tout est correct');
    console.log('   5. Si problème, les backups sont dans: ' + backupDir);

  } catch (err) {
    console.error('❌ Erreur:', err.message);
    process.exit(1);
  }
}

function exportToCsv(guests) {
  // En-têtes du CSV
  const headers = [
    'first_name',
    'last_name',
    'post_name',
    'person_type',
    'phone',
    'email',
    'gender',
    'invitation_status',
    'rsvp_status',
    'guests_count',
    'dietary_restrictions'
  ];

  const rows = guests.map(guest => [
    guest.first_name || '',
    guest.last_name || '',
    guest.post_name || '',
    guest.person_type || '',
    guest.phone || '',
    guest.email || '',
    guest.gender || '',
    guest.invitation_status || '',
    guest.rsvp_status || '',
    guest.guests_count || '',
    guest.dietary_restrictions || ''
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => {
      // Échapper les guillemets et encapsuler les cellules contenant des virgules
      const escaped = String(cell).replace(/"/g, '""');
      return escaped.includes(',') ? `"${escaped}"` : escaped;
    }).join(','))
  ].join('\n');

  return csvContent;
}

main();
