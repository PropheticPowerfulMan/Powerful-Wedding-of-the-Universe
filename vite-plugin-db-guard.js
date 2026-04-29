/**
 * Plugin Vite — Garde de base de données
 * Déclenche une sauvegarde automatique:
 *   • au démarrage du serveur de développement (npm run dev)
 *   • avant chaque build de production (npm run build)
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function runBackup(context) {
  try {
    console.log(`\n🛡️  [DB Guard] Sauvegarde automatique (${context})...`);
    const output = execSync('node db-manager.js backup', {
      cwd: __dirname,
      encoding: 'utf-8',
      timeout: 30000,
    });
    // Extraire la ligne de confirmation uniquement
    const line = output.split('\n').find(l => l.includes('✅ Sauvegarde créée'));
    if (line) console.log(`🛡️  [DB Guard] ${line.trim()}\n`);
  } catch (err) {
    // Ne jamais bloquer le dev/build si la sauvegarde échoue
    console.warn(`\n⚠️  [DB Guard] Sauvegarde impossible: ${err.message}`);
    console.warn('   Le projet continue normalement.\n');
  }
}

export default function dbGuardPlugin() {
  return {
    name: 'vite-plugin-db-guard',

    // Déclenché au démarrage du serveur de dev
    configureServer() {
      runBackup('démarrage dev');
    },

    // Déclenché avant chaque build de production
    buildStart() {
      runBackup('build production');
    },
  };
}
