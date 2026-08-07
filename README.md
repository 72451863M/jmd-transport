# JMD-TRANSPORT — Code source complet

Plateforme logistique pour le Mali et l'ensemble de l'espace UEMOA : mise en relation
clients / transporteurs, suivi GPS en temps réel, paiement Mobile Money, KYC réglementaire,
messagerie interne, gestion documentaire, corridors transfrontaliers et tableau de bord
Business Intelligence.

**114 tests automatisés (tous passants).** Chaque module a été testé à la fois unitairement
et de bout en bout dans un vrai navigateur avant d'être livré.

## Structure

```
jmd-transport/
├── backend/               → API Node.js / Express / MongoDB / Socket.io
│   ├── models/            → 9 modèles de données (User, Livraison, Message, Document...)
│   ├── controllers/       → logique métier, 1 fichier par domaine
│   ├── routes/            → définition des endpoints API
│   ├── utils/, jobs/      → calculs (prix, score IA) et tâches par lot
│   └── tests/             → 15 fichiers de tests automatisés
├── frontend/               → Application React (Vite)
│   ├── src/pages/          → 9 écrans (dashboards, KYC, entreprise, suivi...)
│   ├── src/components/     → éléments réutilisables (messagerie, notifications...)
│   └── src/api/            → un fichier par module, appelle le backend
└── GUIDE_DEPLOIEMENT.md    → déploiement gratuit (MongoDB Atlas + Render + Vercel)
```

## Lancer le projet en local

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Ouvre `.env` et renseigne au minimum :
- `MONGO_URI` → ton URI MongoDB (Atlas ou local, ex: `mongodb://127.0.0.1:27017/jmd_transport`)
- `JWT_SECRET` → une chaîne longue et aléatoire

```bash
npm run dev
```

L'API tourne sur `http://localhost:5000`. Vérifie avec : `http://localhost:5000/api/health`

Pour lancer la suite de tests automatisés :
```bash
npm test
```

Pour peupler les corridors de référence (Dakar–Bamako, Abidjan–Bamako, Lomé–Ouagadougou) :
```bash
node jobs/seedCorridors.js
```

Pour recalculer les scores IA des transporteurs par lot (à brancher sur un cron en production) :
```bash
node jobs/recalculerScoresIA.js
```

### 2. Frontend

Dans un **autre terminal** :

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

L'application est disponible sur `http://localhost:5173`

### 3. Déploiement gratuit

Voir **[GUIDE_DEPLOIEMENT.md](./GUIDE_DEPLOIEMENT.md)** pour mettre le projet en ligne
gratuitement (MongoDB Atlas + Render + Vercel), sans carte bancaire.

## Rôles disponibles

- `client` → crée des demandes, suit ses colis, évalue, réclame, gère son entreprise
- `transporteur` → accepte les missions, partage sa position GPS, confirme la livraison
- `admin` → **ne peut pas être créé via l'inscription publique** (faille de sécurité corrigée
  à l'audit) — change manuellement le champ `role` d'un utilisateur existant en `"admin"`
  dans MongoDB

## Modules fonctionnels

| Module | Contenu |
|---|---|
| Comptes & authentification | Inscription, connexion JWT, mots de passe bcrypt |
| Tarification | Prix calculé serveur (distance, poids, express, créneau nuit) — jamais fourni par le client |
| Commission & paiement | 10 % prélevé automatiquement, choix du mode Mobile Money |
| Attribution & score de fiabilité | Ponctualité, acceptation, notes, ancienneté |
| Intelligence artificielle | Score enrichi calculé par lot (asynchrone, découplé de l'attribution) |
| KYC | Consentement + documents par rôle, conforme Loi n°2013-015 Mali, RCCM/NIF pour les entreprises |
| Évaluations | Notes mutuelles client ↔ transporteur |
| Signature électronique | Preuve de livraison obligatoire (nom + photo/signature) |
| Réclamations | Ouverture, réponse admin, suivi de statut |
| Notifications | 7 types d'événements, cloche en temps réel |
| Entreprises | Comptes multi-utilisateurs, invitation de collaborateurs |
| Documents | Lettre de voiture auto-générée, bons, assurance, photos |
| Messagerie interne | Anti-contournement : aucun numéro de téléphone échangé pendant la mission |
| Corridors logistiques | Détection transfrontalière, corridors de référence UEMOA (sans invention de règles fiscales) |
| Business Intelligence | Revenus, commissions, zones populaires, classement transporteurs |

## Anti-contournement (désintermédiation)

Le téléphone du client n'est **jamais visible** dans la bourse de fret tant qu'aucun
transporteur n'a accepté la mission — seuls le nom et le trajet apparaissent. Une fois
la mission acceptée, les coordonnées se révèlent et la messagerie interne s'ouvre.

## Ce qu'il reste à brancher avant un vrai lancement

- 🔲 Upload de fichiers réel (Cloudinary ou équivalent) — actuellement KYC/documents/preuves
  acceptent une URL saisie manuellement
- 🔲 Intégration réelle Orange Money / Moov Money / Wave (API de paiement)
- 🔲 Règles fiscales et douanières par pays (Module Corridors) — volontairement non inventées,
  à faire valider par un juriste/comptable pays par pays
- 🔲 Application mobile Flutter (le frontend actuel est un site web)
- 🔲 API partenaires (ERP, assurances, banques)
- 🔲 Conditions d'utilisation anti-contournement (document juridique)
- 🔲 Carte interactive (actuellement le suivi affiche les coordonnées + lien Google Maps)

## Notes techniques

- Le backend utilise CommonJS (`require`), le frontend utilise les modules ES (`import`) —
  ce sont deux projets Node séparés.
- Les mots de passe sont hashés avec bcrypt, jamais stockés en clair. L'email est normalisé
  en minuscules à l'inscription, la connexion et l'invitation (bug corrigé : une casse
  différente entre inscription et connexion bloquait l'utilisateur).
- Le Domaine 9 (Paiement/Wallet) est prévu pour être isolé sur PostgreSQL en production
  (voir le cahier des charges V4.0) — MongoDB seul pour l'instant en développement.
- Le token JWT est stocké dans `localStorage` côté frontend et envoyé automatiquement dans
  les headers via l'intercepteur Axios (`src/api/axiosInstance.js`).
