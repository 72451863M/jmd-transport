# Déployer JMD-TRANSPORT gratuitement (sans carte bancaire)

Ce guide utilise 3 services gratuits qui n'exigent pas de carte bancaire :

| Rôle | Service | Coût |
|---|---|---|
| Base de données | MongoDB Atlas (niveau M0) | Gratuit à vie (512 Mo) |
| Backend (API) | Render.com (Web Service gratuit) | Gratuit (le serveur s'endort après 15 min d'inactivité, se réveille en ~30s au premier appel) |
| Frontend (site) | Vercel | Gratuit |

Temps estimé : 30-45 minutes la première fois.

---

## Étape 1 — Créer la base de données (MongoDB Atlas)

1. Va sur **mongodb.com/cloud/atlas/register** et crée un compte (email + mot de passe, aucune carte requise).
2. Crée un nouveau projet, puis clique sur **Build a Database**.
3. Choisis l'option **M0 Free** (gratuite à vie).
4. Choisis une région proche (Europe de préférence, ex. `eu-west-1`).
5. Une fois le cluster créé, va dans **Database Access** → **Add New Database User** :
   - Nom d'utilisateur : `jmd_admin` (ou ce que tu veux)
   - Mot de passe : génère-en un et **note-le quelque part**
6. Va dans **Network Access** → **Add IP Address** → choisis **Allow Access from Anywhere** (`0.0.0.0/0`). C'est nécessaire car Render n'a pas d'adresse IP fixe sur le plan gratuit.
7. Retourne sur **Database** → clique **Connect** sur ton cluster → **Drivers** → copie l'URI de connexion. Elle ressemble à :
   ```
   mongodb+srv://jmd_admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
8. Remplace `<password>` par ton vrai mot de passe, et ajoute le nom de la base après `.net/` :
   ```
   mongodb+srv://jmd_admin:TON_MOT_DE_PASSE@cluster0.xxxxx.mongodb.net/jmd_transport?retryWrites=true&w=majority
   ```
   **Garde cette URI complète** — tu en auras besoin à l'étape 2.

---

## Étape 2 — Déployer le backend (Render)

1. Mets d'abord le code sur GitHub si ce n'est pas déjà fait :
   - Crée un compte sur **github.com** si besoin.
   - Crée un nouveau dépôt (ex. `jmd-transport`), et mets-y le contenu du zip que je t'ai fourni (dossier `backend/` et `frontend/`).
2. Va sur **render.com** et crée un compte (tu peux te connecter directement avec GitHub).
3. Clique **New +** → **Web Service**.
4. Connecte ton dépôt GitHub `jmd-transport`.
5. Configure :
   - **Name** : `jmd-transport-backend`
   - **Root Directory** : `backend`
   - **Runtime** : Node
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
   - **Instance Type** : **Free**
6. Dans **Environment Variables**, ajoute :
   | Clé | Valeur |
   |---|---|
   | `MONGO_URI` | l'URI complète copiée à l'étape 1 |
   | `JWT_SECRET` | une longue chaîne aléatoire (ex. génère-en une sur `randomkeygen.com`) |
   | `JWT_EXPIRES_IN` | `7d` |
   | `CLIENT_URL` | laisse vide pour l'instant, tu la complèteras à l'étape 3 |
   | `PORT` | `10000` (Render l'impose, mais le code lit déjà `process.env.PORT`) |
7. Clique **Create Web Service**. Le déploiement prend 2-5 minutes.
8. Une fois terminé, Render te donne une URL du type :
   ```
   https://jmd-transport-backend.onrender.com
   ```
   Teste-la en visitant `https://jmd-transport-backend.onrender.com/api/health` — tu dois voir `{"status":"OK", ...}`.

---

## Étape 3 — Déployer le frontend (Vercel)

1. Va sur **vercel.com** et connecte-toi avec ton compte GitHub.
2. Clique **Add New** → **Project** → sélectionne ton dépôt `jmd-transport`.
3. Configure :
   - **Root Directory** : `frontend`
   - **Framework Preset** : Vercel détecte automatiquement Vite
4. Dans **Environment Variables**, ajoute :
   | Clé | Valeur |
   |---|---|
   | `VITE_API_URL` | `https://jmd-transport-backend.onrender.com/api` (ton URL Render + `/api`) |
   | `VITE_SOCKET_URL` | `https://jmd-transport-backend.onrender.com` |
5. Clique **Deploy**. Après 1-2 minutes, Vercel te donne une URL du type :
   ```
   https://jmd-transport.vercel.app
   ```

---

## Étape 4 — Reboucler (CORS)

Retourne sur **Render** → ton service backend → **Environment** → modifie `CLIENT_URL` avec l'URL Vercel obtenue à l'étape 3 :
```
CLIENT_URL=https://jmd-transport.vercel.app
```
Sauvegarde — Render redéploie automatiquement (1-2 minutes).

---

## Étape 5 — Créer le premier compte administrateur

Il n'existe volontairement aucun moyen de créer un compte admin depuis le site (c'est la faille de sécurité qu'on a corrigée). Pour créer le tout premier admin :

1. Inscris-toi normalement sur le site comme client.
2. Va sur **MongoDB Atlas** → ton cluster → **Browse Collections** → base `jmd_transport` → collection `users`.
3. Trouve ton compte, clique **Edit**, change `"role": "client"` en `"role": "admin"`.
4. Reconnecte-toi sur le site — tu es maintenant admin.

---

## Vérifications finales

- [ ] `https://TON-BACKEND.onrender.com/api/health` répond `{"status":"OK"}`
- [ ] Le site Vercel s'ouvre et affiche la page d'accueil
- [ ] Une inscription fonctionne (crée un vrai compte, visible dans MongoDB Atlas)
- [ ] Le suivi GPS en temps réel fonctionne (WebSocket via `VITE_SOCKET_URL`)

## Limites du plan gratuit à connaître

- **Render (gratuit)** : le serveur s'endort après 15 minutes sans requête, et met ~30 secondes à se relancer au appel suivant — gênant pour une démo mais pas bloquant. Passer à un plan payant (7$/mois) supprime cette limite.
- **MongoDB Atlas M0** : 512 Mo de stockage, largement suffisant pour tester et faire une première démo, mais à surveiller si le volume de données grandit.
- **Vercel** : aucune limite gênante pour ce projet au stade actuel.

Ce plan permet de faire tourner une vraie démo accessible à n'importe qui avec un lien, sans dépenser un centime. Pour un vrai lancement commercial, il faudra passer les backends payants (pas de mise en veille) et prévoir un nom de domaine.
