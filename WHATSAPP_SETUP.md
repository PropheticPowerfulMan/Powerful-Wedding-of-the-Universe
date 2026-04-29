# 📱 Configuration WhatsApp - Intégration Complète

## 🎯 Objectif
Envoyer des invitations et notifications directement via WhatsApp Business API avec le système d'invitations.

---

## 📋 Prérequis

### 1. Compte Meta Business
- [ ] Créer/accéder à un compte Meta Business (meta.com/business)
- [ ] Accès à Facebook Business Manager

### 2. WhatsApp Business Account
- [ ] Créer une app WhatsApp Business via Meta Developer (developers.facebook.com)
- [ ] Numéro de téléphone WhatsApp Business validé (recommandé: +243 ou votre préfixe local)

---

## 🔑 Obtenir les Credentials

### Étape 1: Access Token WhatsApp
```
🔗 Meta Developer Dashboard → Votre App → Settings → Basic
   → Trouvez: App ID et App Secret
   
Générez un User Access Token:
1. Settings → User Tokens
2. Demande de permissions: whatsapp_business_messaging
3. Copiez le token (valable 60 jours par défaut)
   
OU utilisez un System User Token (persistant):
1. Business Settings → Users → System Users
2. Generate Token avec:
   - whatsapp_business_messaging
   - pages_manage_metadata
   - instagram_basic
3. Copiez le token
```

### Étape 2: Phone Number ID
```
🔗 Meta Developer Dashboard → Votre App → WhatsApp
   → Configuration
   → Numéro de Téléphone: "WABA: +243..."
   → Cliquez → "Gérer les numéros"
   → Dans la liste, trouvez le Phone Number ID
   → Format: Chaîne numérique (~15 chiffres)
   
Alternative via API:
  GET https://graph.instagram.com/v22.0/{BUSINESS_ACCOUNT_ID}/phone_numbers
  + Access Token
  → Réponse contient: id (Phone Number ID)
```

---

## ✅ Configuration Supabase

### Ajout des Secrets en Production

```bash
# 1. Ajouter le token d'accès WhatsApp
npx supabase secrets set WHATSAPP_ACCESS_TOKEN="your_access_token_here"

# 2. Ajouter le Phone Number ID
npx supabase secrets set WHATSAPP_PHONE_NUMBER_ID="your_phone_id_here"

# 3. (Optionnel) Spécifier la version de l'API Graph
npx supabase secrets set WHATSAPP_API_VERSION="v22.0"

# 4. Vérifier
npx supabase secrets list | Select-String "WHATSAPP"
```

### Configuration Locale (Development)

Ajoutez à `.env.local`:
```env
WHATSAPP_ACCESS_TOKEN=your_access_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_id_here
WHATSAPP_API_VERSION=v22.0
```

---

## 📤 Utilisation dans Admin

### Interface Admin - Envoi Ciblé
1. Allez dans **Admin Dashboard** → **Manage Guests**
2. Sélectionnez un ou plusieurs invités
3. Canal: Choisissez **"WhatsApp + Email"** ou **"WhatsApp seulement"**
4. Mode: Cochez/décochez **"Dry run (simulation)"**
5. Cliquez: **"Envoyer (X)"**
6. Consultez le rapport détaillé par invité

### Canaux Disponibles
- ✅ **"WhatsApp seulement"** → Uniquement WhatsApp
- ✅ **"Email seulement"** → Uniquement Email (Resend)
- ✅ **"WhatsApp + Email"** → Les deux (fallback si l'un échoue)

### Statuts de Livraison
| Statut | Signification |
|--------|-------------|
| **eligible** | Invité a le contact requis (phone pour WA, email pour Email) |
| **sent** | Message envoyé avec succès |
| **failed** | Erreur à l'envoi (provider error, contact invalide, etc.) |
| **skipped** | Pas de contact trouvé pour ce canal |

---

## 🧪 Test de Livraison

### Test Dry Run (Recommandé d'abord)
1. Sélectionnez 1 invité de test
2. Canal: **"WhatsApp + Email"**
3. Cochez: **"Dry run (simulation)"**
4. Cliquez: **"Envoyer (1)"**
5. Consultez rapport → Les deux canaux montrent "eligible" si contacts OK

### Test Réel (Envoi Simple)
1. Sélectionnez 1 invité de test (avec numéro WhatsApp vérifié)
2. Canal: **"WhatsApp seulement"** (plus simple pour déboguer)
3. Décochez: **"Dry run (simulation)"**
4. Cliquez: **"Envoyer (1)"**
5. Attendez 1-2 secondes
6. Consultez rapport:
   - ✅ Status = "sent" → Succès! L'invité reçoit le message
   - ❌ Status = "failed" + reason → Erreur (voir détails)

---

## 🐛 Troubleshooting

### Erreur: "WhatsApp channel is not configured for this project" (HTTP 503)
**Solution**: 
- Vérifiez que les secrets sont définis dans Supabase
- Vérifiez la clé `missing_secrets` dans la réponse (ex: `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`)
- Redéployez la fonction en accès public navigateur: `npx supabase functions deploy notify-invitations --no-verify-jwt`

### Erreur: "Invalid phone"
**Solution**:
- Normalisez le numéro: format international requis (+243...)
- Pas d'espaces, tirets, ou parenthèses
- Longueur: 8-15 chiffres (sans le +)

### Erreur: "Unauthorized" (401)
**Solution**:
- Token expiré? Regénérez-en un nouveau (User Tokens: 60j max)
- Utilisez System User Token à la place (persistent)
- Vérifiez que le token a permission `whatsapp_business_messaging`

### Erreur: "Invalid recipient" (Invalid Phone)
**Solution**:
- Numéro de téléphone ne correspond pas à un compte WhatsApp actif
- Assurez-vous que l'invité a un compte WhatsApp avec ce numéro
- Test: Envoyer un message WhatsApp manuel au numéro depuis votre téléphone

### Erreur: "Rate limited"
**Solution**:
- WhatsApp Business a des limites d'envoi (mode business)
- Attendez quelques minutes avant de relancer
- Utilisez des délais entre envois groupés

---

## 📊 Monitoring

### Voir les envois WhatsApp réussis
1. Admin Dashboard → **Manage Guests** table
2. Colonne **"Invitation Status"** → "sent" indique succès précédent
3. Via rapport d'envoi directement après clic sur "Envoyer"

### Logs Détaillés
- Chaque envoi génère un rapport avec:
  - Guest name, phone, status, timestamp
  - Message d'erreur si failure
  - Heure d'envoi exacte

---

## 🔄 Renouvellement des Credentials

### Token Access (User Token - Expire 60 jours)
```bash
1. Meta Developer → Votre App
2. Tools → Token Debugger
3. Collez votre token actuel
4. Vérifiez expiration
5. Si expiré: Settings → User Tokens → Générez un nouveau
6. Mettez à jour Supabase: npx supabase secrets set WHATSAPP_ACCESS_TOKEN="..."
```

### Phone Number ID (Persistant)
- Ne change pas sauf si vous changez de numéro WhatsApp Business
- Conservez-le en lieu sûr (Bitwarden, LastPass, etc.)

---

## 🎓 Ressources

- **Meta Developers**: https://developers.facebook.com/docs/whatsapp
- **Business API Docs**: https://www.whatsapp.com/business/api
- **Phone Number Management**: https://developers.facebook.com/docs/whatsapp/cloud-api/phone-numbers
- **API Reference**: https://developers.facebook.com/docs/graph-api/reference/whatsapp-business-account

---

## ✨ Cas d'Utilisation Courants

### Envoyer à tous les invités non confirmés
1. Filtres: RSVP Status = "Pending" (En attente)
2. Cliquez: "Select all visible"
3. Canal: "WhatsApp + Email"
4. Dry run: ON (vérifier d'abord)
5. Envoyer

### Envoyer à la famille uniquement
1. Filtres: Person Type = "Family"
2. Cliquez: "Select all visible"
3. Canal: "WhatsApp seulement"
4. Dry run: OFF (envoi réel)
5. Envoyer

### Tester avec 1 contact
1. Trouvez un ami avec WhatsApp sur ce numéro
2. Filtres: Recherchez son nom
3. Sélectionnez
4. Dry run: ON
5. Cliquez: "Envoyer (1)"
6. Vérifiez le rapport
7. Réglez d'après le rapport
8. Redéployez si besoin

---

## ❓ FAQ

**Q: Puis-je utiliser un WhatsApp personnel?**  
R: Non, vous avez besoin d'une WhatsApp Business Account (gratuit avec Meta Business).

**Q: Combien ça coûte?**  
R: Meta WhatsApp Business: gratuit avec achat de crédits pour les messages. ~0.0050 € / message sortant.

**Q: Les messages sont-ils limités?**  
R: Mode Business: 1 message par personne par jour (hors réponse). Utilisez des templates approuvés pour plus.

**Q: Puis-je envoyer des images/vidéos?**  
R: Actuellement non, le système envoie du texte uniquement. À étendre si besoin.

---

**Status**: ✅ Système prêt. En attente credentials WhatsApp.
