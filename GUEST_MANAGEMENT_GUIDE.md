# 📋 Système Avancé de Gestion des Invités

## Vue d'ensemble

Un système complet de gestion des invités avec filtrage multiniveaux, tri alphabétique intelligent et rapports détaillés.

---

## 🆕 Nouvelles Fonctionnalités

### 1. **Classification par Type de Personne**
Les invités peuvent maintenant être catégorisés par type:
- 👨‍👩‍👧 **Famille** (Famille)
- 👥 **Amis** (Amis)  
- 💼 **Travail** (Collègues/professionnels)

#### Implémentation
- Base de données: Colonne `person_type` ajoutée à la table `guests`
- Types TypeScript: `'family' | 'friends' | 'work'`
- Valeur par défaut: `'family'`
- Migrationexecution: [20260416_add_person_type_and_enhancements.sql](supabase/migrations/)

---

### 2. **Tri Alphabétique Avancé**

#### Options de tri disponibles:
- **Alphabétique (Défaut)**: Trie par Nom + Prénom (ex: "Mukendi Jean")
- **Prénom**: Trie par prénom uniquement
- **Date d'ajout**: Trie par date de création (plus récent d'abord)

```typescript
// Direction de tri
// Nom, Prénom (A → Z)
// Implémentation: Utilise localeCompare avec locale 'fr-FR'
```

**Exemple:**
```
✓ Mukendi Jean
✓ Mukendi Marie  
✓ Nsundi Pierre
✓ Nsundi Sophie
```

---

### 3. **Système de Filtrage Multiniveaux**

#### Niveaux de filtrage:

| Niveau | Options | Comportement |
|--------|---------|-------------|
| **Type** | Famille, Amis, Travail, Tous | Filtre par catégorie |
| **Invitation** | En attente, Envoyée, Confirmée, Tous | Filtre par statut d'invitation |
| **RSVP** | Confirmé, En attente, Non confirmé, Peut-être, Tous | Filtre par réponse |
| **Recherche** | Texte libre | Recherche par nom, prénom, groupe, post-nom |

#### Combinaison de filtres
Les filtres se **combinent** (ET logique):
```
Type = Famille ET Invitation = Envoyée ET RSVP = En attente
→ Affiche uniquement les membres de la famille avec une invitation envoyée 
  qui n'ont pas encore répondu
```

#### Recherche en cascade
Une **recherche pénètre tous les niveaux** - elle fonctionne sur:
- 🔤 Prénom
- 🔤 Nom
- 🔤 Post-nom
- 🔤 Groupe

---

### 4. **Composants Disponibles**

#### A. GuestManager
Gestionnaire complet des invités avec interface admin.

**Fonctionnalités:**
- ✅ Affichage filtré et trié
- ✅ Ajout/modification/suppression d'invités
- ✅ Upload CSV en masse
- ✅ Export en CSV
- ✅ Statistiques temps réel
- ✅ Édition en ligne

**Import:**
```typescript
import GuestManager from '../components/GuestManager';

// Dans votre composant:
<GuestManager />
```

**Statistiques Affichées:**
```
- Total d'invités
- Répartition par type (Famille, Amis, Travail)
- Confirmés / En attente / Non confirmés
- Invitées
```

---

#### B. GuestReports
Dashboard de rapports et statistiques avancées.

**Fonctionnalités:**
- 📊 Graphiques par type avec pourcentages
- 📋 Statut de réponse détaillé
- 📈 Vue d'ensemble par catégorie
- 📑 Résumé textuel

**Import:**
```typescript
import GuestReports from '../components/GuestReports';

// Dans votre composant:
<GuestReports guests={guestsList} />
```

---

#### C. Hooks Réutilisables

**useGuestFiltering**
Filtre et trie les invités selon les critères spécifiés.

```typescript
import { useGuestFiltering, type FilterState } from '../hooks/useGuestFiltering';

const filters: FilterState = {
  personType: 'family',      // ou 'all'
  invitationStatus: 'sent',   // ou 'all'
  rsvpStatus: 'pending',      // ou 'all'
  searchTerm: 'jean',         // texte de recherche
  sortBy: 'alphabetic'        // ou 'name', 'created'
};

const filteredGuests = useGuestFiltering(guests, filters);
```

**useGuestStatistics**
Calcule les statistiques détaillées des invités, y compris les répartitions par type.

```typescript
import { useGuestStatistics } from '../hooks/useGuestFiltering';

const stats = useGuestStatistics(guests);
// Retourne:
// {
//   total: 50
//   family: 30,
//   friends: 15,
//   work: 5,
//   attending: 35,
//   pending: 10,
//   notAttending: 5,
//   invited: 45,
//   byType: {
//     family: { total: 30, attending: 25, pending: 3, notAttending: 2 },
//     friends: { total: 15, attending: 8, pending: 5, notAttending: 2 },
//     work: { total: 5, attending: 2, pending: 2, notAttending: 1 }
//   }
// }
```

---

### 5. **Upload/Import CSV**

#### Format accepté:
```csv
first_name,last_name,post_name,group_name,person_type,invitation_status,rsvp_status
Jean,Mukendi,Emmanuel,Famille,family,pending,pending
Marie,Nsundi,,Amis,friends,sent,attending
```

#### Colonnes détectées automatiquement:
- `first_name` (requis) - variantes: firstname, first name, prenom, prénom
- `last_name` (requis) - variantes: lastname, last name, nom, family name
- `post_name` - variantes: postname, post name, postnom, middle name
- `group_name` - variantes: group, groupe
- `person_type` - variantes: type, type_personne

#### Défauts appliqués:
- `person_type`: 'family' si absent
- `invitation_status`: 'pending' si absent
- `rsvp_status`: 'pending' si absent

---

### 6. **Export CSV**

Exporte tous les invités filtrés avec toutes les colonnes:
```
Prénom, Nom, Post-nom, Groupe, Type, Invitation, RSVP, Repas, Nombre d'invités, Notes
```

**Nom du fichier:** `guests_YYYY-MM-DD.csv`

---

## 🎯 Cas d'Utilisation

### Scénario 1: Voir tous les invités par ordre alphabétique
1. Ouvrir GuestManager
2. Vérifier que le tri est en "Alphabétique (Nom, Prénom)"
3. Tous les filtres sur "Tous"
4. ✅ Liste alphabétique complète

### Scénario 2: Filtrer les amis qui n'ont pas répondu
1. Ouvrir GuestManager
2. Cliquer sur l'icône Filtre
3. Type = "Amis"
4. RSVP = "En attente"
5. ✅ Affiche les amis sans réponse, triés alphabétiquement

### Scénario 3: Chercher un groupe spécifique, par exemple "Service"
1. Ouvrir GuestManager
2. Taper "Service" dans la barre de recherche
3. ✅ Affiche tous les invités avec "Service" dans le groupe/nom/prénom, triés alphabétiquement

### Scénario 4: Voir les statistiques générales
1. Ouvrir GuestReports
2. Voir les graphiques de répartition par type
3. Voir le statut de réponse
4. ✅ Compréhension complète de l'engagement des invités

---

## 🔧 Configuration de la Base de Données

### Migration SQL
```sql
-- Exécutée automatically lors du déploiement Supabase
ALTER TABLE guests ADD COLUMN person_type TEXT DEFAULT 'family';
CREATE INDEX idx_guests_person_type ON guests(person_type);
CREATE INDEX idx_guests_combined_filter ON guests(person_type, rsvp_status, invitation_status);
```

### Accès à Supabase
- **Credentials**: Fichier `.env.local`
- **Variables**: 
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

---

## 📦 Structure de Fichiers

```
src/
├── components/
│   ├── GuestManager.tsx      ← Gestionnaire principal
│   ├── GuestReports.tsx      ← Rapports et statistiques
│   ├── Admin.tsx              ← Amélioration existante
│   └── ...
├── hooks/
│   ├── useGuestFiltering.ts  ← Hooks de filtrage
│   └── useCountdown.ts
├── types/
│   ├── database.ts            ← Mise à jour avec person_type
│   └── index.ts               ← Mise à jour avec person_type
└── lib/
    └── supabase.ts
```

---

## 🚀 Bonnes Pratiques

### 1. Tri Alphabétique
```typescript
// ✅ CORRECT - Utilise localeCompare avec locale française
"Mukendi Jean".localeCompare("Nsundi Pierre", 'fr-FR')

// ❌ ÉVITER - Tri simple ASCII
"Mukendi Jean" < "Nsundi Pierre"
```

### 2. Filtrage
```typescript
// ✅ CORRECT - Combine les filtres avec ET
if (type === filter AND status === filter AND search.includes(term)) {
  include(guest);
}

// ❌ ÉVITER - OU logique qui produit trop de résultats
if (type === filter OR status === filter OR search.includes(term)) {
  include(guest);
}
```

### 3. Performance
```typescript
// ✅ CORRECT - Utilise useMemo pour éviter les recalculs
const filteredGuests = useMemo(() => {
  return filter(guests, filters);
}, [guests, filters]);

// ❌ ÉVITER - Recalcul à chaque render
const filteredGuests = filter(guests, filters);
```

---

## 🔐 Sécurité

- Password Admin: `powerful2026` (changeable)
- RLS Policies: Supabase JSON Web Tokens (JWT)
- HTTPS: Force sur tout le domaine
- Données sensibles: Chiffrement côté serveur

---

## 📝 Notes

- Les changements sont automatiquement synchronisés
- Les statistiques se mettent à jour en temps réel
- Le tri ignore les accents (é = e)
- Les recherches sont insensibles à la casse
- La pagination peut être ajoutée pour les grands volumes (>5000 invités)

---

## 🆘 Dépannage

### Les invités ne s'affichent pas
1. Vérifier la connexion Supabase
2. Vérifier que `person_type` est défini
3. Vérifier les RLS policies

### Le tri alphabétique n'est pas correct
1. Vérifier que la locale est réglée à `'fr-FR'`
2. Vérifier que les accents sont correctement saisis
3. Consulter la console pour les erreurs

### Upload CSV échoue
1. Vérifier que les colonnes existent (au minimum: first_name, last_name)
2. Vérifier l'encodage UTF-8
3. Vérifier les séparateurs (virgule)

---

## 📞 Support

Pour des modifications ou améliorations:
1. Consulter le composant correspondant
2. Vérifier les types TypeScript
3. Tester les cas limites
4. Documenter les changements

---

**Version:** 1.0
**Dernière mise à jour:** 16 avril 2026
**Créé par:** Assistant IA Copilot
