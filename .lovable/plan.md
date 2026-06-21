# Plan — LB Access Cloud

Plateforme SaaS sécurisée (en français) pour gérer l'accès client à des services numériques que l'administrateur est légalement autorisé à distribuer. Étant donné l'ampleur du cahier des charges, je propose de livrer en **2 phases**. Cette phase 1 produit un MVP complet et utilisable ; la phase 2 ajoute les modules avancés.

## Stack & sécurité

- TanStack Start + Tailwind v4, design system premium (vert émeraude, charbon, or, crème).
- Lovable Cloud (Supabase) : Auth admin/agent, RLS stricte, `user_roles` séparé + `has_role()` SECURITY DEFINER.
- Mots de passe des comptes de service chiffrés via `pgsop` (`pgp_sym_encrypt` avec clé serveur), déchiffrés uniquement par fonctions serveur autorisées + audit log.
- Codes d'accès clients stockés **hashés** (SHA-256 + sel). Vérification via server function avec rate limiting (5 tentatives / 15 min par IP).
- Aucune session client : le code est la clé, validation à chaque requête via server function publique.

## Phase 1 — MVP livré maintenant

### Base de données (migration)
Tables : `profiles` (admin), `user_roles` + enum `app_role` (admin/agent), `clients`, `client_access_codes`, `services`, `service_accounts`, `service_profiles` (renommé pour éviter conflit avec `profiles`), `payments`, `support_requests`, `audit_logs`. RLS + GRANTs sur chaque table. Trigger auto-création profil + rôle admin pour le premier user.

### Pages publiques
- `/` — Page de saisie du code d'accès (logo, champ code, bouton, états d'erreur génériques).
- `/espace/$token` — Portail client (après validation du code) : cartes service, profil/PIN, email, mot de passe masqué + bouton "Afficher" (avec confirmation et log), boutons copier, date de renouvellement, statut, instructions, bouton WhatsApp support, "J'ai un problème", "Demander un renouvellement".

### Admin (sous `_authenticated/`)
- `/admin` — Login (email/password).
- `/admin/dashboard` — KPIs (clients, actifs, expirations, revenus mensuels, paiements en attente, occupation), graphiques (revenus/mois, expirations 7j, occupation par compte) via Recharts, alertes.
- `/admin/clients` — Liste + recherche + filtres statut + création/édition/suspension/renouvellement + génération de code.
- `/admin/clients/$id` — Détails client, historique accès, paiements, assignations.
- `/admin/services` — CRUD services (Netflix, Prime, custom) avec slots par défaut.
- `/admin/comptes` — CRUD comptes de service, statut, rotation credentials.
- `/admin/profils` — Vue assignation profils/slots (libre/occupé), assignation 1-clic, libération, transfert.
- `/admin/paiements` — Ajout paiement, méthode, période, alertes échéances.
- `/admin/alertes` — Vue consolidée (expirations, paiements dus, comptes pleins).
- `/admin/audit` — Logs filtrables.
- `/admin/parametres` — Profil admin, gestion agents.

### Server functions clés
- `verifyAccessCode(code, optional contact)` — public, rate-limited, retourne token signé court (15 min) + données client si OK, message générique sinon.
- `getClientSpace(token)` — public, retourne données assignées du client.
- `revealPassword(token, profileId)` — log la consultation, retourne mot de passe déchiffré.
- `generateAccessCode(clientId, expiresAt)` — admin, format `LB-XXXX-XX`, hash, invalide les anciens.
- CRUD protégés par `requireSupabaseAuth` + `has_role`.

### Données de démo
Migration de seed : 5 clients, 2 comptes Netflix (5 profils chacun), 1 compte Prime, assignations mixtes, paiements, logs.

### Design system
Tokens OKLCH (vert émeraude profond, charbon, or doux, crème), cartes arrondies, ombres élégantes, sidebar admin, badges de statut, polices Playfair Display + Inter.

## Phase 2 — à confirmer après livraison Phase 1

- 2FA admin (TOTP)
- Modèles de notifications WhatsApp/email configurables + envoi
- Module agents avec permissions granulaires sur credentials
- Génération PDF de reçus
- Rotation automatique des credentials avec rappels
- Export CSV (clients, paiements, audit)
- Webhooks de paiement

## Confirmation demandée

1. OK pour activer **Lovable Cloud** et démarrer la Phase 1 maintenant ?
2. Devise par défaut pour les paiements : **XOF (FCFA)**, EUR, USD, autre ?
3. Numéro WhatsApp support à pré-câbler (sinon je mets un placeholder modifiable dans Paramètres) ?
