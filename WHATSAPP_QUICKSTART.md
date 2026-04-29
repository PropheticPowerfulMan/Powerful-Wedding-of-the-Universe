# 🚀 WhatsApp System - Quick Start (2 min)

## État Actuel ✅
- ✅ Email: **Opérationnel** (envois réels)
- ✅ Interface Admin: **Complète** (multi-destinataire)
- ✅ Système complet: **Stable et testé**
- ⏳ WhatsApp: **Prêt, en attente credentials**

---

## 🎯 Commencer Immédiatement (Aujourd'hui)

### Option 1️⃣ : Tester Email (1 minute)
```
1. Admin Dashboard → Manage Guests
2. Sélectionnez 1 invité (ex: first_name="Jean")
3. Canal: "Email seulement"
4. Dry run: ☑️ (checked)
5. Cliquez: "Envoyer (1)"
6. Consulter rapport → "eligible" et "sent"
```

### Option 2️⃣ : Envoyer Réellement (1 minute)
```
Même chose, mais:
- Dry run: ☐ (unchecked)
- Cliquez: "Envoyer (1)"
- ✅ L'invité reçoit l'Email
- ✅ Statut Invitation = "sent" (auto)
```

### Option 3️⃣ : Tester à Plusieurs (1 minute)
```
1. Filtres: RSVP Status = "Pending"
2. Cliquez: "Select all visible" (ex: 5 invités)
3. Canal: "Email seulement"
4. Dry run: ☑️ (simulation d'abord)
5. Cliquez: "Envoyer (5)"
```

---

## 📱 Ajouter WhatsApp (Quand Prêt - 15 min)

### Étape 1: Obtenir Credentials
1. Lire **WHATSAPP_SETUP.md** (5 min)
2. Créer Meta Business Account (si pas déjà fait)
3. Copier les 2 credentials:
   - `WHATSAPP_ACCESS_TOKEN`
   - `WHATSAPP_PHONE_NUMBER_ID`

### Étape 2: Configurer Supabase
```bash
# Terminal à la racine du projet
npx supabase secrets set WHATSAPP_ACCESS_TOKEN="your_token_here"
npx supabase secrets set WHATSAPP_PHONE_NUMBER_ID="your_phone_id"

# Redéployer
npx supabase functions deploy notify-invitations --no-verify-jwt
```

### Étape 3: Tester
```
1. Admin Dashboard
2. Sélectionnez 1 invité
3. Canal: "WhatsApp + Email" (nouvelle option!)
4. Dry run: ☑️ (vérifier d'abord)
5. Envoyer
6. Si OK → décochez Dry run et envoyez réellement
```

---

## 📚 Documentation

| Fichier | Contenu |
|---------|---------|
| **WHATSAPP_SETUP.md** | Guide complet obtention credentials + troubleshooting |
| **WHATSAPP_SOLUTION.md** | Résumé technique de la solution |
| **GUEST_MANAGEMENT_GUIDE.md** | Admin Dashboard utilisation |
| **QUICK_START.md** | Setup initial du projet |

---

## ⚡ Points Clés

### ✅ Actuellement Possible
- Envoyer Email à 1 ou plusieurs invités
- Simulation (dry-run) sans conso
- Envoi réel avec mise à jour auto du statut
- Rapport détaillé par invité (succès/erreur/raison)

### ➕ À Ajouter Après WhatsApp Config
- Envoyer aussi via WhatsApp
- Utiliser les 2 canaux simultanément
- Choisir channel par channel

---

## 🐛 Troubleshooting Rapide

| Problème | Solution |
|----------|----------|
| Email n'arrive pas (dry-run OK) | Vérifier RESEND_API_KEY valide |
| Email échoue avec 403 | Resend sandbox: envoyer à jonathanlokala9@gmail.com uniquement |
| Admin Dashboard vide | Rafraîchir page ou vérifier filtres |
| Rapport affiche "skipped" | Contact manquant pour ce canal (phone pour WA, email pour Email) |

---

## 📞 Next Steps

### Demain 🌅
- [ ] Tester Email (Option 1 ci-dessus - 1 min)
- [ ] Lire WHATSAPP_SETUP.md (si intéressé par WhatsApp - 5 min)

### Cette Semaine 📅
- [ ] Tester Email réel à plusieurs (Option 3 - 1 min)
- [ ] Obtenir credentials WhatsApp (15 min si décidé)
- [ ] Ajouter credentials à Supabase (5 min)
- [ ] Tester WhatsApp (1 min)

### Production 🚀
- [ ] Envoyer invitations à tous les guests
- [ ] Surveiller statuts RSVP
- [ ] Relancer rappels 1 semaine avant événement

---

## 💡 Tips

- **Avant d'envoyer réel**: Toujours test dry-run d'abord
- **Tester simple**: Commencer avec Email, puis ajouter WhatsApp
- **Pour déboguer**: Cliquez sur 1 seul invité d'abord, regarder rapport détaillé
- **Crédits**: Email (~0.05€/msg), WhatsApp (~0.005€/msg) → budget limité si test

---

## ✨ C'est Tout!

**Le système est prêt. Email fonctionne. WhatsApp awaiting credentials.**

Questions? Consultez les docs ou les rapports détaillés dans Admin Dashboard.

**🎉 Bon courrier!**
