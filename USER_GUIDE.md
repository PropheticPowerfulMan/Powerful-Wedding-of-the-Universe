# 📺 Guide d'Utilisation Rapide - Système de Gestion des Invités

## 🎬 Tutoriel Pas à Pas

### Scénario 1: Afficher la liste complète en ordre alphabétique

**Temps**: 30 secondes

1. Ouvrir le **GuestManager**
2. Tous les invités s'affichent automatiquement en ordre **Nom + Prénom**
3. Scroll pour voir tous les invités
4. ✅ Terminé

**Résultat Attendu**:
```
✓ Mukendi Jean
✓ Mukendi Marie
✓ Nsundi Emmanuel
✓ Nsundi Pierre
```

---

### Scénario 2: Filtrer par type de personne (Exemple: Voir tous les "Amis")

**Temps**: 1 minute

1. Ouvrir le **GuestManager**
2. Cliquer sur l'icône **Filtre** (entonnoir)
3. Le panneau des filtres s'ouvre
4. Sélectionner `Type = "Amis"`
5. Les autres conditions laissent à "Tous"
6. ✅ Seuls les amis s'affichent, toujours alphabétiques

**Résultat Attendu**:
```
Amis uniquement:
✓ Bernard Sophie
✓ Dupont Marie
✓ Fournier Thomas
```

---

### Scénario 3: Filtrer complexe (Amis + Confirmés + Pas encore répondu?)

**Temps**: 2 minutes

1. Ouvrir le **GuestManager**
2. Cliquer sur **Filtre**
3. Type = "Amis"
4. RSVP = "En attente"
5. Invitation = "Envoyée"
6. Autres = "Tous"
7. ✅ Affiche UNIQUEMENT les amis avec invitation envoyée qui n'ont pas répondu

**Résultat Attendu**:
```
Amis + Invitation Envoyée + RSVP En attente:
✓ Dupont Marie
✓ Fournier Thomas
```

---

### Scénario 4: Chercher un invité par nom

**Temps**: 15 secondes

1. Ouvrir le **GuestManager**
2. Taper dans la **barre de recherche**: `"Jean"`
3. La liste se filtre en temps réel
4. Affiche tous les invités avec "Jean" dans:
   - Prénom
   - Nom
   - Groupe
   - Post-nom
5. ✅ Terminé

**Résultat Attendu**:
```
Recherche "Jean":
✓ Mukendi Jean
✓ Jean-Pierre Sophie (groupe contains "Jean")
```

---

### Scénario 5: Combiner filtres + recherche

**Temps**: 2 minutes

1. Ouvrir le **GuestManager**
2. Cliquer **Filtre**
3. Type = "Famille"
4. Fermer le filtre
5. Taper dans recherche: `"Marie"`
6. ✅ Affiche UNIQUEMENT les "Marie" qui sont de la Famille

**Résultat Attendu**:
```
Famille + Nom "Marie":
✓ Mukendi Marie
✓ Nsundi Marie
```

---

### Scénario 6: Trier différemment

**Temps**: 30 secondes

1. Ouvrir le **GuestManager**
2. Cliquer **Filtre**
3. **Trier par** = changez la sélection:
   - "Alphabétique (Nom, Prénom)" - Par défaut
   - "Prénom" - Trier par prénom seulement
   - "Date d'ajout" - Plus récents d'abord
4. Voir l'ordre changer automatiquement
5. ✅ Terminé

---

### Scénario 7: Voir les statistiques

**Temps**: 1 minute 30 secondes

1. Ouvrir le **GuestManager**
2. Voir les 4 cartes en haut:
   - **Total**: Nombre total d'invités
   - **Famille**: Nombre de membres de la famille
   - **Amis**: Nombre d'amis
   - **Travail**: Nombre de collègues
3. Voir les 4 autres cartes:
   - **Confirmés**: Nombre qui viennent (vert)
   - **En attente**: Nombre sans réponse (jaune)
   - **Non confirmés**: Nombre qui ne viennent pas (rouge)
   - **Invités**: Nombre d'invitations envoyées (or)
4. ✅ Vue d'ensemble complète

**Exemple Résultat**:
```
Total: 50 invités
Famille: 25 | Amis: 15 | Travail: 10
Confirmés: 35 | En attente: 10 | Non confirmés: 5
```

---

### Scénario 8: Voir les rapports détaillés

**Temps**: 2 minutes

**ATTENTION**: Cette vue s'appelle `GuestReports` - À intégrer séparément

1. Ouvrir la page **Rapports**
2. Voir en bas 4 cartes principales:
   - Famille + taux confirmation
   - Amis + taux confirmation
   - Travail + taux confirmation
3. Voir les graphiques:
   - Barres par type (%)
   - Barres par statut RSVP (%)
4. Voir le résumé texte
5. ✅ Analyse complète

---

### Scénario 9: Exporter en CSV

**Temps**: 30 secondes

1. Ouvrir le **GuestManager**
2. Appliquer les filtres souhaités (optionnel)
3. Cliquer sur l'icône **Télécharger** (en haut à droite)
4. Le fichier `guests_YYYY-MM-DD.csv` se télécharge
5. ✅ Ouvrir avec Excel/Libreoffice

**Fichier CSV contient**:
```
Prénom, Nom, Post-nom, Groupe, Type, Invitation, RSVP, Repas, Nombre, Notes
```

---

### Scénario 10: Ajouter/Modifier un invité

**Temps**: 1 minute

1. Ouvrir le **GuestManager**
2. Voir la liste des invités
3. Cliquer sur l'icône **Éditer** (crayon) sur une ligne
4. Les champs deviennent modifiables:
   - Prénom
   - Nom
   - Type (Famille/Amis/Travail)
5. Modifier les informations
6. Cliquer **Enregistrer**
7. ✅ Mise à jour immédiate

---

### Scénario 11: Supprimer un invité

**Temps**: 30 secondes

1. Ouvrir le **GuestManager**
2. Cliquer sur l'icône **Poubelle** (rouge)
3. Une confirmation s'affiche: "Êtes-vous certain?"
4. Cliquer **OK** pour confirmer
5. L'invité est supprimé
6. ✅ Suppression irréversible (attention!)

---

### Scénario 12: Importer (Upload) une liste CSV

**Temps**: 2 minutes

1. Aller à la page **Admin** ou **Upload**
2. Voir la zone **"Télécharger un fichier CSV"**
3. Préparer un fichier CSV avec les colonnes:
   ```
   first_name,last_name,post_name,group_name,person_type
   Jean,Mukendi,Emmanuel,Famille,family
   Marie,Nsundi,,Amis,friends
   ```
4. Glisser-déposer le fichier OU cliquer pour sélectionner
5. Le fichier s'upload automatiquement
6. Voir le résumé: "✅ 2 ajoutés, 0 échoués"
7. ✅ Invités importés

---

## 🎨 Interface - Éléments Clés

### En Haut de Page
```
┌─────────────────────────────────────────────────┐
│ 🔍 Rechercher un invité... ← Barre cherche      │
│ 🔽 (Filtre)  ⟲ (Réinitialiser)  ⬇ (Export)     │
└─────────────────────────────────────────────────┘
```

### Panneaux Filtres (Caché par défaut)
```
┌─────────────────────────────────────────────────┐
│ Type: [▼ Tous]        Invitation: [▼ Tous]     │
│ RSVP: [▼ Tous]        Trier par: [▼ Alphabétique │
└─────────────────────────────────────────────────┘
```

### Statistiques
```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ Total: 50    │ Famille: 25  │ Amis: 15     │ Travail: 10  │
├──────────────┼──────────────┼──────────────┼──────────────┤
│ Confirmés:35 │ En attente:10│ Non conf:5   │ Invités:45   │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

### Liste Invités
```
┌─────────────────────────────────────────────────────────────┐
│ Mukendi Jean                              👨 Famille ✉️ ✅  │
│ Post-nom: Emmanuel | Groupe: Famille A                     │
│                             [✏️ Edit]  [🗑️ Delete]        │
├─────────────────────────────────────────────────────────────┤
│ Nsundi Marie                              👥 Amis ▶️ ⏳    │
│ Groupe: Paris Friends                                       │
│                             [✏️ Edit]  [🗑️ Delete]        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Cas Pratiques Vrai Mariage

### Matin du mariage: Qui arrive?
```
1. Ouvrir GuestManager
2. Filtre: RSVP = "Confirmé"
3. Voir les 35 confirmés
4. Export en CSV pour envoyer au traiteur
5. ✅ "35 personnes confirmées"
```

### Une semaine avant: Qui n'a pas répondu?
```
1. GuestManager
2. Filtre: RSVP = "En attente" + Invitation = "Envoyée"
3. Voir 10 personnes
4. Appeller ces 10 personnes pour relancer
5. ✅ "Rappeler Jean, Marie, Pierre..."
```

### Vendredi avant: Vérifier les groupes
```
1. GuestManager
2. Filtre: Type = "Famille"
3. Voir tous membres famille
4. Vérifier que tous sont confirmés
5. ✅ "Famille: 20/25 confirmés"
```

### Table de réception: Placer les gens
```
1. GuestManager
2. Recherche: "Table 5"
3. Voir qui va à la Table 5
4. Print en PDF ou CSV
5. ✅ "Table 5: Jean, Marie, Pierre, Sophie"
```

### Allergies alimentaires: Préparer les plats
```
1. GuestManager
2. Recherche: "végétarien"
3. Export en CSV avec colonne "meal_preference"
4. Envoyer au traiteur
5. ✅ "5 végétariens à préparer"
```

---

## ⚡ Raccourcis Clavier

```
Ctrl/Cmd + F    : Ouvre la recherche (navigateur)
Enter           : Valide la recherche
Escape          : Ferme le panneau de filtre
Ctrl/Cmd + E    : Export CSV (à ajouter)
```

---

## 🆘 Problèmes Courants & Solutions

### "Je ne vois aucun invité"
```
✓ Vérifier que vous avez uploadzé une liste CSV
✓ Vérifier la connexion à Internet
✓ Recharger la page (F5)
✓ Réinitialiser les filtres (clic bouton ⟲)
```

### "L'ordre n'est pas alphabétique"
```
✓ Vérifier que Tri = "Alphabétique (Nom, Prénom)"
✓ Vérifier que les noms sont correctement saisis
✓ Les accents sont respectés (é = é, pas e)
```

### "Ma recherche ne fonctionne pas"
```
✓ Vérifier l'orthographe exacte
✓ Essayer sans accents
✓ Essayer avec minuscules/majuscules inversées
✓ Réinitialiser les filtres et réessayer
```

### "Je ne peux pas modifier un invité"
```
✓ Cliquer sur l'icône ✏️ Éditer (crayon)
✓ Les champs deviennent modifiables
✓ Cliquer sur "Enregistrer" après modification
✓ Les changements sont sauvegardés automatiquement
```

---

## 📱 Sur Mobile

```
✓ Recherche: Même principe
✓ Filtres: Cliquer sur 🔽, voir les options en fullscreen
✓ Édition: Interface adaptée au tactile
✓ Export: Télécharge le fichier dans les téléchargements
```

---

## 🎓 Tips & Tricks

### Tri Rapide
- **Cliquer plusieurs fois** sur la colonne "Tri" pour changer rapidement entre les ordres

### Filtre Complèt
- Laisser **tous les filtres à "Tous"** pour voir tout le monde

### Recherche Puissante
- Rechercher par **groupe complet**: "Paris Friends"
- Rechercher par **partie du nom**: "Mar" (trouve Marie, Marcellin, etc.)

### Export Smart
- Exporter APRÈS avoir filtré pour ne prendre que ce qu'on veut

### Réinitialiser Vite
- Cliquer sur le bouton **⟲** pour tout réinitialiser d'un coup

---

## 🚀 Flux de Travail Complet

### Semaine 1: Import Initial
```
1. Préparer liste Excel
2. Exporter en CSV
3. Upload dans GuestManager
4. Vérifier les doublons
```

### Semaine 2-3: Suivi
```
1. Chaque jour: Vérifier "En attente"
2. Appeler les 3-5 qui n'ont pas répondu
3. Mettre à jour le statut RSVP
4. Exporter pour le traiteur
```

### Semaine 4: Finalisations
```
1. Vérifier que tous les statuts sont Good
2. Exporter la liste finale
3. Vérifier les allergies/repas
4. Envoyer au traiteur
```

### Jour J: Check-in
```
1. Avoir la liste à portée
2. Cocher les gens qui arrivent
3. Gérer les dernière-minutes no-shows
```

---

**💡 Besoin d'aide?** Consultez la documentation complète dans:
- `GUEST_MANAGEMENT_GUIDE.md` - Guide technique
- `IMPLEMENTATION_CHECKLIST.md` - Checklist
- `INTEGRATION_GUIDE.md` - Intégration dans l'app

**Date**: 16 avril 2026
**Version**: 1.0 - Guide Utilisateur
