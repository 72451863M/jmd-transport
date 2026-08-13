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

## Retours associés intégrés (08/08/2026)

- **Upload réel de documents KYC** — la page KYC accepte maintenant un vrai fichier (photo/PDF) envoyé depuis le navigateur, plus besoin de coller un lien
- **Documents consultables par l'admin** — chaque document déposé s'affiche en aperçu cliquable dans le tableau de bord admin
- **Relance KYC** — l'admin peut relancer manuellement un transporteur au dossier incomplet (notification), et un script `jobs/relancerKYCManquant.js` permet de le faire en masse (à brancher sur un cron)
- **Mesure associée** — un transporteur ne peut plus accepter de mission tant que son dossier KYC n'est pas validé
- **Recherche par téléphone** — barre de recherche dans la liste des utilisateurs du tableau de bord admin
- **Réduction du temps d'attente client** — tous les transporteurs actifs et au KYC validé sont notifiés dès qu'une nouvelle demande est créée, plutôt que de compter sur eux pour consulter la bourse de fret

⚠️ **Important pour le site déjà déployé** : cette mise à jour introduit une règle plus stricte — un transporteur doit avoir son KYC validé pour accepter une mission. Si tu redéploies cette version sur ton site en ligne existant, les transporteurs déjà inscrits (comme ceux utilisés lors des démonstrations) ne pourront plus accepter de mission tant que tu n'auras pas validé leur dossier KYC dans le tableau de bord admin.

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
| Gestion de flotte | Un transporteur peut enregistrer plusieurs véhicules (immatriculation, type, capacité, chauffeur affecté), en choisir un à l'acceptation d'une mission — repris automatiquement sur la lettre de voiture |
| Gestion des transporteurs | Module 3 du cahier des charges : un transporteur peut gérer son entreprise (RCCM/NIF, collaborateurs — auparavant réservé aux clients), gérer ses chauffeurs (fiche nom/téléphone/permis, indépendante des véhicules), et consulter ses performances (revenu généré, missions, note moyenne, scores) |
| Suivi GPS | Module 10 : position en temps réel (WebSocket), carte visuelle (Leaflet/OpenStreetMap, gratuit, sans clé API), itinéraire parcouru affiché, détection automatique des arrêts, alerte de retard, alerte de sortie d'itinéraire poussée en temps réel — **limites assumées** : la déviation est calculée par rapport à une ligne droite départ→arrivée, pas au vrai réseau routier (aucun service de routage payant branché) ; seule l'adresse de départ peut être géolocalisée par le client (bouton « Utiliser ma position actuelle »), l'arrivée reste un texte libre sans coordonnées — l'alerte de déviation ne s'active donc que si les deux sont un jour renseignées |
| Gestion des marchandises | Module 6 : les 8 types de fret du cahier des charges (colis, palettes, matériaux de construction, produits agricoles, produits pétroliers, produits dangereux, produits réfrigérés, conteneurs), avec de vraies règles vérifiées — compatibilité obligatoire entre le type de marchandise et le véhicule choisi (ex. produits réfrigérés → véhicule frigorifique, sinon acceptation refusée), déclaration explicite obligatoire pour les matières pétrolières/dangereuses avant de pouvoir créer la demande — **limite assumée** : pas de classification réglementaire réelle (ADR, température exacte...), la déclaration responsabilise l'expéditeur plutôt que de prétendre à une validation réglementaire que l'application ne peut pas faire |
| Administration (paramètres système) | Module 24 : commission, pays actifs et devise réellement configurables par l'admin (auparavant fixés en dur dans le code) ; taxes par corridor enregistrables une fois validées par un comptable/juriste (jamais de taux inventé par défaut) ; page listant honnêtement les 3 rôles et ce que chacun peut faire — **limite assumée** : pas d'éditeur de permissions granulaire (les rôles restent fixes dans le code), pas de vraie conversion multi-devises (FCFA uniquement) |
| Audit / traçabilité | Module 25 : journal d'audit centralisé (connexion, modification, suppression, validation — branché sur la connexion, la gestion de flotte/chauffeurs, les paramètres système, la validation KYC), non bloquant par conception (un souci d'écriture n'interrompt jamais l'action métier d'origine, testé en simulant une panne), consultable et filtrable par l'admin — **limite assumée** : la catégorie « paiement » existe dans le modèle mais reste vide, aucun paiement réel n'existe encore (Module 13) |
| Centre d'assistance | Module 28 : FAQ (gestion admin, lecture publique), recherche par mots-clés façon « chatbot », système de tickets distinct des réclamations (pas obligatoirement lié à une livraison — pour les questions générales type « pourquoi mon KYC a été rejeté »), conversation par messages, statut qui avance automatiquement (ouvert → en cours dès qu'un admin répond), notification au client — **limite assumée et clairement affichée à l'utilisateur** : ce n'est pas un vrai chatbot conversationnel basé sur une IA (aucune clé API de service de langage n'est branchée sur ce projet), juste une recherche de correspondance de mots-clés dans la FAQ |
| Comptabilité | Module 14 : facture générée automatiquement à chaque livraison livrée (numéro, montant, commission, net transporteur — réutilise l'infrastructure Documents existante), statut de paiement activé (le champ existait déjà dans le schéma mais n'était utilisé nulle part), remboursements enregistrés, rapport financier (facturé/commission/net transporteurs/répartition des paiements/remboursements) — **limite assumée** : comme pour les taxes, aucun paiement ni remboursement réel n'est exécuté (Mobile Money non branché, Module 13) ; le statut de paiement et les remboursements sont des confirmations manuelles de ce qui a été réglé en dehors de l'application (espèces, Mobile Money direct entre les parties) |
| Centre d'assistance | Module 28 : FAQ gérée par l'admin, « chatbot » de recherche par mots-clés (testé : trouve la bonne fiche, ignore les entrées désactivées, ne renvoie rien plutôt que d'inventer une réponse), système de tickets distinct des réclamations (qui restent liées à une livraison) — conversation par messages, statut qui passe automatiquement en cours dès la réponse de l'admin, seul l'admin peut fermer définitivement — **limite assumée et documentée** : ce n'est pas un vrai chatbot conversationnel basé sur une IA (aucune clé API de service de langage n'est branchée sur ce projet) |

## Anti-contournement (désintermédiation)

Le téléphone du client n'est **jamais visible** dans la bourse de fret tant qu'aucun
transporteur n'a accepté la mission — seuls le nom et le trajet apparaissent. Une fois
la mission acceptée, les coordonnées se révèlent et la messagerie interne s'ouvre.

## Ce qu'il reste à brancher avant un vrai lancement

- 🔲 Stockage cloud des fichiers (Cloudinary ou équivalent) — l'upload fonctionne déjà
  (photo/PDF envoyés en base64, stockés directement en base), mais un vrai service de
  stockage externe serait plus adapté à grande échelle
- 🔲 Intégration réelle Orange Money / Moov Money / Wave (API de paiement)
- 🔲 Règles fiscales et douanières par pays (Module Corridors) — volontairement non inventées,
  à faire valider par un juriste/comptable pays par pays
- 🔲 Application mobile Flutter (le frontend actuel est un site web)
- 🔲 API partenaires (ERP, assurances, banques)
- 🔲 Conditions d'utilisation anti-contournement (document juridique)
- 🔲 Géocodage d'adresse (convertir un texte comme « Sikasso centre » en coordonnées GPS
  automatiquement) — nécessiterait un service comme Nominatim/Mapbox ; pour l'instant seul le
  départ peut être géolocalisé, via la position GPS réelle du navigateur du client
- 🔲 Service de routage réel (Google/Mapbox Directions) pour une détection de déviation basée
  sur le vrai réseau routier plutôt qu'une ligne droite
- 🔲 Comptes "chauffeur" séparés — un véhicule de la flotte a un chauffeur affecté en texte
  libre, pas encore un vrai compte utilisateur distinct

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
