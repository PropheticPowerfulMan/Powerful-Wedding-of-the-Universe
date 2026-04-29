# 🔗 Guide d'Intégration - Installation des Nouveaux Composants

## Option 1: Intégration Simple dans App.tsx

```typescript
import Particles from './components/Particles';
import Navigation from './components/Navigation';
import Hero from './components/Hero';
import OurStory from './components/OurStory';
import Vision from './components/Vision';
import EventProgram from './components/EventProgram';
import Gallery from './components/Gallery';
import RSVP from './components/RSVP';
import GroomMessage from './components/GroomMessage';
import InvitationSystem from './components/InvitationSystem';
import Admin from './components/Admin';
import Footer from './components/Footer';

// NOUVEAU - Importer GuestManager
import GuestManager from './components/GuestManager';

export default function App() {
  return (
    <div className="bg-black text-white min-h-screen">
      <Particles />
      <Navigation />
      <main>
        <Hero />
        <OurStory />
        <Vision />
        <EventProgram />
        <Gallery />
        <GroomMessage />
        <RSVP />
        <InvitationSystem />
        <Admin />
        
        {/* NOUVEAU */}
        <GuestManager />
        
      </main>
      <Footer />
    </div>
  );
}
```

---

## Option 2: Page Dédiée pour Gestionnaire

### Créer: `src/pages/GuestManagementPage.tsx`

```typescript
import GuestManager from '../components/GuestManager';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';

export default function GuestManagementPage() {
  return (
    <div className="bg-black text-white min-h-screen">
      <Navigation />
      <main className="py-12">
        <GuestManager />
      </main>
      <Footer />
    </div>
  );
}
```

### Intégrer dans routing (si vous utilisez React Router):
```typescript
import GuestManagementPage from './pages/GuestManagementPage';

const routes = [
  { path: '/admin/guests', element: <GuestManagementPage /> },
  // ... autres routes ...
];
```

---

## Option 3: Panel Admin Amélioré

### Modifier: `src/components/Admin.tsx`

Ajouter un onglet pour le gestionnaire avancé:

```typescript
import { useState } from 'react';
import GuestManager from './GuestManager';
import GuestReports from './GuestReports';

type AdminTab = 'login' | 'guests' | 'upload' | 'advanced' | 'reports';

export default function Admin() {
  const [tab, setTab] = useState<AdminTab>('login');
  
  // ... code d'authentification existant ...
  
  return (
    <section id="admin">
      {/* Code existant... */}
      
      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setTab('guests')}>Manage Guests</button>
        <button onClick={() => setTab('upload')}>Upload</button>
        <button onClick={() => setTab('advanced')}>Advanced Manager</button>
        <button onClick={() => setTab('reports')}>Reports</button>
      </div>
      
      {tab === 'advanced' && <GuestManager />}
      {tab === 'reports' && <GuestReports guests={guests} />}
    </section>
  );
}
```

---

## Option 4: Tableau de Bord Personnalisé

### Créer: `src/components/AdminDashboard.tsx`

```typescript
import { useState, useEffect } from 'react';
import GuestManager from './GuestManager';
import GuestReports from './GuestReports';
import { supabase } from '../lib/supabase';
import type { Guest } from '../types';

export default function AdminDashboard() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const loadGuests = async () => {
      const { data } = await supabase.from('guests').select('*');
      setGuests((data as Guest[]) || []);
    };
    loadGuests();
  }, []);

  return (
    <div className="bg-black text-white min-h-screen py-8">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="mb-8">
          <h1 className="text-4xl font-cinzel font-bold mb-2">Wedding Admin Dashboard</h1>
          <p className="text-white/60">Manage all wedding guests and statistics</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-gold/20 pb-4">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 font-cinzel ${
              activeTab === 'overview'
                ? 'text-gold border-b-2 border-gold'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`px-4 py-2 font-cinzel ${
              activeTab === 'manage'
                ? 'text-gold border-b-2 border-gold'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Manage Guests
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 font-cinzel ${
              activeTab === 'reports'
                ? 'text-gold border-b-2 border-gold'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Reports
          </button>
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-cinzel font-bold">Quick Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Stat cards */}
            </div>
          </div>
        )}

        {activeTab === 'manage' && <GuestManager />}
        {activeTab === 'reports' && <GuestReports guests={guests} />}
      </div>
    </div>
  );
}
```

---

## Option 5: Intégration Minimale (Module Seul)

Si vous voulez juste le gestionnaire sans admin panel:

```typescript
// Dans App.tsx
import GuestManager from './components/GuestManager';

export default function App() {
  return (
    <>
      <Navigation />
      <GuestManager />
      <Footer />
    </>
  );
}
```

---

## 📋 Checklist d'Intégration

### Avant d'intégrer
- [ ] Migration SQL exécutée dans Supabase
- [ ] Types TypeScript mis à jour
- [ ] Composants créés et sans erreurs
- [ ] Hooks importables sans problèmes

### Pendant l'intégration
- [ ] Importer correctement les composants
- [ ] Vérifier les chemins d'import (`../components/`)
- [ ] Tester que les données se chargent
- [ ] Vérifier que Supabase est accessible

### Après l'intégration
- [ ] Tester l'affichage des invités
- [ ] Tester les filtres
- [ ] Tester le tri alphabétique
- [ ] Tester l'upload CSV
- [ ] Tester l'export CSV
- [ ] Tester sur mobile

---

## 🐛 Dépannage d'Intégration

### Erreur: "Cannot find module 'GuestManager'"
```typescript
// Vérifier le chemin correct
import GuestManager from './components/GuestManager';  // ✅
import GuestManager from './GuestManager';             // ❌
```

### Erreur: "Type 'Guest' is not defined"
```typescript
// Importer le type
import type { Guest } from './types';
```

### Erreur: "supabase is not available"
```typescript
// Vérifier que les env vars sont définies
console.log(import.meta.env.VITE_SUPABASE_URL);
```

### Composants ne se chargent pas
```typescript
// Vérifier l'ordre des imports
// Les composants enfants AVANT les composants parents
```

---

## 🎨 Appliquer les Styles Existants

Les composants utilisent les mêmes styles que votre projet:

```typescript
// Fonts déjà disponibles
font-cinzel    // Titres
font-cormorant // Textes

// Couleurs déjà disponibles
bg-black       // Fond
text-white     // Texte
text-gold      // Accentuation
border-gold    // Bordures
```

Aucune nouvelle dépendance CSS requise! ✅

---

## 🔗 Dépendances Requises

Détenu vérifier que vous avez:

```json
{
  "dependencies": {
    "react": "^18.x",
    "react-dom": "^18.x",
    "@supabase/supabase-js": "^2.x",
    "lucide-react": "^latest"
  }
}
```

Si `lucide-react` manque:
```bash
npm install lucide-react
```

---

## 📦 Import Complète Guide

### Composants
```typescript
import GuestManager from '@/components/GuestManager';
import GuestReports from '@/components/GuestReports';
```

### Hooks
```typescript
import {
  useGuestFiltering,
  useGuestStatistics,
  type FilterState,
  type Statistics,
} from '@/hooks/useGuestFiltering';
```

### Types
```typescript
import type {
  Guest,
  PersonType,
  InvitationStatus,
  RSVPStatus,
} from '@/types';
```

---

## 🚀 Configuration Vite (Alias d'Import)

Si vous utilisez l'alias `@`:

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

Alors vous pouvez importer ainsi:
```typescript
import GuestManager from '@/components/GuestManager';
```

---

## 🧪 Test d'Intégration

### Test Minimal
```typescript
import { useEffect, useState } from 'react';
import GuestManager from './components/GuestManager';

export default function TestPage() {
  const [test, setTest] = useState(false);

  useEffect(() => {
    // Vérifier que le composant se monte
    setTest(true);
  }, []);

  if (!test) return <div>Loading...</div>;
  return <GuestManager />;
}
```

### Test avec Console
```typescript
// Dans GuestManager.tsx, au début du composant
console.log('🎉 GuestManager mounted successfully!');
console.log('Guests:', guests.length);
console.log('Filters:', filter);
```

---

## 📊 Aperçu de la Structure Finale

```
App.tsx
├── Navigation
├── Hero
├── ... autres sections ...
├── GuestManager          ← NOUVEAU
│   ├── Search bar
│   ├── Advanced filters
│   ├── Guest list
│   └── Stats
├── GuestReports          ← NOUVEAU
│   ├── Charts
│   └── Statistics
└── Footer
```

---

## ✨ Prochaines Étapes

1. ✅ Choisir une option d'intégration
2. ✅ Copier le code
3. ✅ Exécuter la migration SQL
4. ✅ Tester dans votre app locale
5. ✅ Déployer en production

---

**Questions?** Consultez:
- `GUEST_MANAGEMENT_GUIDE.md` - Guide complet
- `IMPLEMENTATION_CHECKLIST.md` - Checklist
- `src/components/GuestManager.tsx` - Code source

**Date**: 16 avril 2026
**Statut**: ✅ Prêt pour intégration
