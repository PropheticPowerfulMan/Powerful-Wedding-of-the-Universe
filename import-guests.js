#!/usr/bin/env node

/**
 * Script d'import automatique du CSV dans Supabase local
 * Utilisation: node import-guests.js
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

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Erreur: Variables d\'environnement Supabase non trouvées');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  const guests = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    const cells = parseCSVLine(line);
    const guest = {};
    
    headers.forEach((header, index) => {
      const value = cells[index]?.trim() || '';
      guest[header] = value === '' ? null : value;
    });
    
    guests.push(guest);
  }
  
  return guests;
}

function parseCSVLine(line) {
  const cells = [];
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

    if (char === ',' && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells;
}

async function importGuests(guests, availableColumns) {
  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  for (const guest of guests) {
    // Filtrer uniquement les colonnes disponibles dans la base de données
    const cleanGuest = {};
    Object.entries(guest).forEach(([key, value]) => {
      if (!availableColumns.includes(key)) return;
      if (value === null || value === '' || value === 'null') {
        cleanGuest[key] = null;
      } else {
        cleanGuest[key] = value;
      }
    });
    // Vérifier si l'invité existe déjà
    const { data: existing, error: checkError } = await supabase
      .from('guests')
      .select('id')
      .eq('first_name', cleanGuest.first_name)
      .eq('last_name', cleanGuest.last_name)
      .single();

    if (existing) {
      // Mettre à jour
      const { error } = await supabase
        .from('guests')
        .update(cleanGuest)
        .eq('id', existing.id);

      if (error) {
        errorCount++;
        errors.push(`❌ Erreur lors de la mise à jour de ${cleanGuest.first_name} ${cleanGuest.last_name}: ${error.message}`);
      } else {
        successCount++;
        console.log(`🔄 Mis à jour: ${cleanGuest.first_name} ${cleanGuest.last_name}`);
      }
    } else {
      // Insérer
      const { error } = await supabase
        .from('guests')
        .insert([cleanGuest]);

      if (error) {
        errorCount++;
        errors.push(`❌ Erreur lors de l'ajout de ${cleanGuest.first_name} ${cleanGuest.last_name}: ${error.message}`);
      } else {
        successCount++;
        console.log(`✅ Ajouté: ${cleanGuest.first_name} ${cleanGuest.last_name}`);
      }
    }
  }

  return { successCount, errorCount, errors };
}

async function main() {
  try {
    // Récupérer les colonnes réelles de la table
    const { data: sample, error: sampleError } = await supabase
      .from('guests')
      .select('*')
      .limit(1);

    if (sampleError) {
      console.error('❌ Impossible de lire la table guests:', sampleError.message);
      process.exit(1);
    }

    // Colonnes disponibles dans la base de données
    const availableColumns = sample && sample.length > 0
      ? Object.keys(sample[0])
      : ['first_name', 'last_name', 'post_name', 'person_type', 'phone', 'gender', 'invitation_status', 'rsvp_status', 'guests_count'];

    console.log('📋 Colonnes disponibles:', availableColumns.join(', '), '\n');
    const csvPath = path.join(__dirname, 'guests-export.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.error(`❌ Fichier CSV non trouvé: ${csvPath}`);
      process.exit(1);
    }

    console.log('📥 Lecture du fichier CSV...');
    const guests = await parseCSV(csvPath);
    console.log(`✅ ${guests.length} invités trouvés dans le CSV\n`);

    console.log('📤 Import dans Supabase...');
    const { successCount, errorCount, errors } = await importGuests(guests, availableColumns);

    console.log('\n📊 Résumé de l\'import:');
    console.log(`   ✅ Ajoutés/Mis à jour: ${successCount}`);
    console.log(`   ❌ Erreurs: ${errorCount}`);

    if (errors.length > 0) {
      console.log('\n⚠️  Détails des erreurs:');
      errors.forEach(error => console.log(error));
    }

    if (errorCount === 0) {
      console.log('\n✨ Import terminé avec succès!');
      console.log('🎉 Tous les invités sont maintenant synchronisés!');
    }

  } catch (err) {
    console.error('❌ Erreur:', err.message);
    process.exit(1);
  }
}

main();
