# TP FIFA — version nettoyée et documentée de A à Z

## 1) Ce que contient **cette** version nettoyée

Cette version garde **uniquement le projet réellement utilisé à l’exécution**.

Elle supprime :
- les anciens essais de frontend qui n’étaient plus branchés au backend actuel ;
- les anciens `controllers / models / routes` Node qui n’étaient plus importés ;
- les `node_modules`, fichiers IDE, Git et fichiers racine sans utilité au runtime ;
- le HTML/CSS mort non appelé ;
- le modal de vente mort dans `mes-joueurs.html` qui n’était jamais piloté par le JavaScript.

Cette version garde :
- le **backend Express actif** ;
- le **frontend public actif** ;
- le **dump SQL** ;
- la configuration `.env` / `.env.example` ;
- un README détaillé pour expliquer exactement comment tout s’enchaîne.

---

## 2) Arborescence finale utile

```text
.
├── README.md
├── hm502200_fifa (2).sql
├── backend/
│   ├── .env
│   ├── .env.example
│   ├── package.json
│   ├── package-lock.json
│   └── src/
│       ├── config/
│       │   └── db.js
│       └── server.js
└── frontend/
    └── public/
        ├── accueil.html
        ├── boutique.html
        ├── composition.html
        ├── marche.html
        ├── mes-joueurs.html
        ├── auth/
        │   ├── login.html
        │   ├── login.js
        │   ├── register.html
        │   └── register.js
        ├── css/
        │   ├── accueil.css
        │   ├── auth.css
        │   ├── boutique.css
        │   ├── composition.css
        │   ├── marche.css
        │   └── mes-joueurs.css
        └── js/
            ├── accueil.js
            ├── boutique.js
            ├── composition.js
            ├── header.js
            ├── marche.js
            └── mes-joueurs.js
```

---

## 3) Résumé ultra simple de l’architecture

Le projet fonctionne comme ça :

1. le navigateur ouvre une page HTML dans `frontend/public` ;
2. cette page charge un ou plusieurs fichiers JavaScript ;
3. ces scripts envoient des requêtes HTTP au serveur Node/Express ;
4. le serveur Express lit la session utilisateur grâce au cookie `sid` ;
5. le serveur exécute des requêtes SQL sur la base MySQL distante ;
6. le serveur renvoie du JSON ;
7. le JavaScript du navigateur met à jour l’interface.

Autrement dit :

```text
Navigateur -> HTML -> JS front -> API Express -> MySQL distante -> JSON -> rendu HTML
```

---

## 4) Les fichiers supprimés et pourquoi

### 4.1 Backend supprimé

Supprimés car **non importés** par `backend/src/server.js` :
- `backend/src/controllers/*`
- `backend/src/models/*`
- `backend/src/routes/*`

Pourquoi ?
Le backend réellement exécuté a été regroupé directement dans `server.js`. Les anciens contrôleurs/modèles/routes étaient des restes d’une ancienne organisation, mais **le serveur actuel ne les utilise pas**.

### 4.2 Frontend supprimé

Supprimés car ils appartenaient à un ancien frontend non branché au backend actuel :
- `frontend/src/*`
- `frontend/public/app.js`
- `frontend/public/js/app.js`
- `frontend/public/collection.html`
- `frontend/public/dashboard.html`
- `frontend/public/equipe.html`
- `frontend/public/marketplace.html`
- `frontend/public/packs.html`
- `frontend/public/style.css`
- `frontend/public/css/style.css`
- `frontend/public/img/*`
- `frontend/public/index.html`

Pourquoi ?
Ces fichiers visaient une ancienne navigation (`dashboard / collection / packs / marketplace / equipe`) et appelaient des routes qui ne correspondent plus au backend final.

### 4.3 Racine supprimée

Supprimés car inutiles au projet livré :
- `.git/`
- `.idea/`
- `node_modules/`
- `backend/node_modules/`
- `package.json` racine
- `package-lock.json` racine
- `.htaccess`

---

## 5) Comment lancer le projet

Depuis le dossier `backend` :

```bash
npm install
npm start
```

Puis ouvrir dans le navigateur :

```text
http://localhost:8000/login
```

Pourquoi on ouvre `/login` ?
Parce que `server.js` expose cette page explicitement et redirige ensuite l’utilisateur vers le jeu après authentification.

---

## 6) Comment la connexion à la base distante fonctionne

### 6.1 Les fichiers impliqués

- `backend/.env`
- `backend/.env.example`
- `backend/src/config/db.js`
- `backend/src/server.js`

### 6.2 Les variables d’environnement attendues

Le backend lit :

- `PORT`
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`

### 6.3 Ce que fait `backend/src/config/db.js`

Ce fichier crée un **pool MySQL partagé** avec `mysql2/promise`.

Code logique :

1. il charge les variables d’environnement ;
2. il appelle `mysql.createPool(...)` ;
3. il exporte le pool ;
4. tout le reste du backend réutilise ce pool pour faire ses requêtes SQL.

Important :
- `waitForConnections: true` signifie que les requêtes attendent une connexion libre si besoin ;
- `connectionLimit: 10` limite le nombre de connexions ouvertes ;
- `ssl: { rejectUnauthorized: false }` permet la connexion TLS à une base distante même si le certificat n’est pas validé strictement côté Node.

### 6.4 Rôle de Render, Aiven et DBeaver

Dans le fonctionnement réel, leurs rôles sont différents :

- **Render** : héberge ton backend Node/Express en ligne.
- **Aiven** : héberge la base MySQL distante.
- **DBeaver** : sert à se connecter manuellement à la base pour l’inspecter, tester, modifier ou administrer les tables.

Très important :
- **DBeaver ne fait pas tourner l’application** ;
- **Render et le backend Node** font tourner l’application ;
- **Aiven (ou l’hôte MySQL configuré)** stocke réellement les données.

### 6.5 Chaîne exacte de connexion à la base

Quand le projet tourne :

```text
Navigateur -> appelle une route /api/... sur le backend
Backend Express -> exécute du code dans server.js
server.js -> utilise le pool exporté par db.js
pool MySQL -> ouvre/réutilise une connexion distante
Base distante -> répond à la requête SQL
Backend -> transforme la réponse SQL en JSON
Front -> affiche le JSON
```

### 6.6 En local vs en ligne

- en **local**, le backend lit `backend/.env` ;
- sur **Render**, tu mets les mêmes variables dans les Environment Variables du service ;
- dans les deux cas, **le code applicatif est le même** ; seule la source des variables change.

---

## 7) Vue globale du backend

Le backend tient presque entièrement dans **un seul fichier : `backend/src/server.js`**.

Ce fichier fait tout :
- configuration Express ;
- gestion de session maison ;
- routes HTML ;
- routes API ;
- logique d’équipe ;
- logique des packs ;
- logique du marketplace ;
- lecture d’image joueur avec cache local ;
- helpers SQL.

### 7.1 Ordre réel d’exécution dans `server.js`

Quand tu lances `node src/server.js`, le fichier est lu de haut en bas :

1. imports (`express`, `dotenv`, `path`, `crypto`, `fs/promises`, `url`, `pool`) ;
2. `dotenv.config()` charge les variables d’environnement ;
3. création de `app = express()` ;
4. calcul des chemins (`publicPath`, `imageCachePath`) ;
5. création des états mémoire :
   - `sessions = new Map()`
   - `packJobs = new Map()`
6. définition des constantes :
   - `TEAM_LIMITS`
   - `INITIAL_CREDITS`
   - `REGEN_CREDITS`
7. activation des middlewares `express.json()` et `express.urlencoded(...)` ;
8. ajout du middleware custom qui lit le cookie et reconstruit `req.session` ;
9. déclaration des routes publiques (`/`, `/login`, `/register`, `/login` POST, `/logout`, `/api/inscription`, `/health`, `/player-image/:id`) ;
10. ajout du garde d’authentification sur `/api` ;
11. déclaration des routes API authentifiées ;
12. `express.static(publicPath)` pour servir les fichiers du frontend ;
13. route 404 finale ;
14. `app.listen(PORT)` ;
15. définition des fonctions utilitaires en bas du fichier.

Oui : en JavaScript, ces fonctions sont utilisables même si elles sont définies plus bas, car les `function declarations` sont hoistées.

---

## 8) Backend — middlewares et état mémoire

### 8.1 `app.use(express.json())`
Permet de lire un body JSON envoyé par `fetch(..., { headers: {'Content-Type':'application/json'} })`.

### 8.2 `app.use(express.urlencoded({ extended: true }))`
Permet de lire les formulaires HTML classiques (`application/x-www-form-urlencoded`), notamment la page de connexion.

### 8.3 Middleware custom de session

Ce middleware exécute :
- `lireCookies(req.headers.cookie || '')`
- récupère `sid`
- vérifie si `sessions` possède ce `sid`
- place la session trouvée dans `req.session`

Conséquence :
- toutes les routes suivantes savent immédiatement si l’utilisateur est connecté.

### 8.4 `sessions = new Map()`
C’est la mémoire serveur des sessions.

Structure logique :

```js
sid -> { id, pseudo, createdAt }
```

Limite importante :
- si le serveur redémarre, toutes les sessions disparaissent.

### 8.5 `packJobs = new Map()`
C’est une mémoire temporaire utilisée pour l’ouverture de pack asynchrone.

Structure logique :

```js
uuid -> {
  uuid,
  statut: 'PENDING' | 'READY' | 'FAILED',
  message,
  cartes
}
```

---

## 9) Backend — routes publiques

### 9.1 `GET /`

**But** : redirection d’entrée.

**Logique** :
- si `req.session` existe -> redirection vers `/accueil.html`
- sinon -> redirection vers `/login`

**Qui l’utilise ?**
- l’utilisateur qui tape juste l’URL racine.

### 9.2 `GET /login`

Envoie le fichier :
- `frontend/public/auth/login.html`

### 9.3 `GET /register`

Envoie le fichier :
- `frontend/public/auth/register.html`

### 9.4 `POST /login`

**But** : authentifier l’utilisateur.

**Entrée** :
- `pseudo` ou `username`
- `mdp` ou `password`

**Ordre exact** :
1. lire les champs du formulaire ;
2. vérifier qu’ils existent ;
3. appeler `trouverUtilisateurParPseudo(pseudo)` ;
4. charger `bcrypt` dynamiquement ;
5. comparer le mot de passe brut avec le hash SQL ;
6. si c’est correct :
   - `creerSession(...)`
   - `poserCookieSession(res, sid)`
7. si le client attend du JSON -> renvoyer JSON ;
8. sinon -> rediriger vers `/accueil.html`.

**Qui l’utilise ?**
- `login.html`, via le **submit HTML natif** du formulaire.

### 9.5 `POST /logout`

**But** : déconnexion.

**Ordre** :
1. récupérer `sid` depuis le cookie ;
2. supprimer l’entrée dans `sessions` ;
3. supprimer le cookie navigateur ;
4. renvoyer un JSON de confirmation.

**Qui l’utilise ?**
- `header.js` quand on clique sur “Déconnexion”.

### 9.6 `POST /api/inscription`

**But** : créer un nouveau compte.

**Ordre exact** :
1. lire `pseudo` et `mdp` ;
2. valider :
   - pseudo non vide ;
   - mot de passe non vide ;
   - pseudo alphanumérique ;
   - mot de passe >= 8 caractères ;
3. vérifier que le pseudo n’existe pas déjà ;
4. hasher le mot de passe avec bcrypt ;
5. lancer une transaction SQL avec `avecTransaction(...)` ;
6. dans la transaction :
   - insérer dans `utilisateurs` ;
   - créer le portefeuille avec crédits initiaux ;
   - créer la ligne d’équipe ;
   - appeler `creerEquipeDepart(conn, newUserId)` ;
7. renvoyer `201` avec l’id et le pseudo.

**Qui l’utilise ?**
- `frontend/public/auth/register.js`.

### 9.7 `GET /health`

**But** : vérifier rapidement si la base répond.

**Ordre** :
- exécute `SELECT 1`.

### 9.8 `GET /player-image/:id`

**But** : servir l’image d’un joueur avec cache local.

**Ordre** :
1. lire l’id du joueur ;
2. récupérer `image_url` depuis la table `joueurs` ;
3. appeler `recupererImageJoueurCachee(playerId, imageUrl)` ;
4. si cache local ou téléchargement distant OK -> renvoyer l’image ;
5. sinon -> `envoyerImageJoueurParDefaut(res)`.

**Qui l’utilise ?**
- toutes les pages qui affichent des joueurs.

---

## 10) Backend — garde d’authentification API

`app.use('/api', ...)` protège toutes les routes `/api/*` sauf `/api/inscription`.

Règle :
- si `req.session` n’existe pas -> `401 Non authentifié`
- sinon -> la requête continue.

Donc :
- on peut s’inscrire sans être connecté ;
- toutes les routes du jeu exigent une session.

---

## 11) Backend — routes API authentifiées

### 11.1 `GET /api/moi`
Retourne `{ id, pseudo }` depuis la session mémoire.

**Appelé par** :
- `header.js`
- `marche.js`
- `login.js` (auto-login)

### 11.2 `GET /api/moi/credits`

**But** : renvoyer le nombre de crédits.

**Ordre** :
1. appelle `recupererOuCreerPortefeuille(req.session.id)` ;
2. renvoie `{ credits }`.

**Appelé par** :
- `header.js`
- `boutique.js`
- `mes-joueurs.js`
- `login.js`
- `marche.js` après achat

### 11.3 `POST /api/moi/credits/regenerer`

Ajoute `REGEN_CREDITS` au portefeuille, puis relit le portefeuille et renvoie le nouveau solde.

**Appelé par** :
- `header.js`

### 11.4 `GET /api/moi/cartes`

Appelle `recupererCartesUtilisateur(req.session.id)` et renvoie la collection du joueur.

**Appelé par** :
- `mes-joueurs.js`
- `composition.js`

### 11.5 `GET /api/moi/equipe`

Appelle `recupererEquipe(req.session.id)` et renvoie l’équipe structurée.

**Appelé par** :
- `accueil.js`
- `composition.js`

### 11.6 `POST /api/moi/equipe/cartes`

**But** : ajouter une carte à l’équipe.

**Entrée** :
- `carteId`
- `poste`

**Ordre exact** :
1. vérifier `carteId` et `poste` ;
2. récupérer la carte + son vrai poste SQL ;
3. vérifier qu’elle existe ;
4. vérifier qu’elle appartient bien à l’utilisateur ;
5. vérifier qu’elle correspond au poste demandé ;
6. compter le nombre de cartes déjà posées à ce poste ;
7. refuser si la limite est atteinte (`TEAM_LIMITS`) ;
8. vérifier que cette carte n’est pas déjà dans l’équipe ;
9. insérer dans `equipes_cartes` ;
10. renvoyer la nouvelle équipe complète.

**Appelé par** :
- `composition.js` via `ajouterCarteEquipe(...)`.

### 11.7 `DELETE /api/moi/equipe/cartes/:carteId`

Supprime la carte de `equipes_cartes`, puis renvoie la nouvelle équipe.

**Appelé par** :
- `composition.js` via `retirerCarteEquipe(...)`.

### 11.8 `GET /api/packs`

Lit `types_packs` et transforme les colonnes SQL en JSON plus propre.

**Appelé par** :
- `boutique.js`

### 11.9 `POST /api/packs/:id/ouvrir`

**But** : lancer l’ouverture d’un pack sans bloquer immédiatement la réponse.

**Ordre exact** :
1. lire `packId` ;
2. créer un `uuid` ;
3. ajouter un job `PENDING` dans `packJobs` ;
4. lancer `setImmediate(async () => { ... ouvrirPack(...) ... })` ;
5. répondre tout de suite avec `{ uuid }`.

**Pourquoi ce système existe ?**
Parce que le front veut :
- démarrer une animation tout de suite ;
- puis interroger le backend ensuite jusqu’à ce que le pack soit prêt.

**Appelé par** :
- `boutique.js`

### 11.10 `GET /api/packs/:uuid`

Retourne l’état du job :
- `206` si `PENDING`
- `200` si `READY`
- `404` si UUID inconnu

**Appelé par** :
- `boutique.js` via `attendrePackPret(...)`

### 11.11 `GET /api/marketplace`

Lit les annonces du marché avec jointures SQL :
- annonce
- carte
- joueur
- vendeur
- statut “en équipe”

Puis transforme chaque ligne avec `transformerLigneAnnoncePourVue(row)`.

**Appelé par** :
- `marche.js`

### 11.12 `POST /api/marketplace/annonces`

**But** : mettre une carte en vente.

**Ordre exact** :
1. lire `carteId` et `prix` ;
2. vérifier que le prix est positif ;
3. récupérer la carte ;
4. vérifier qu’elle existe ;
5. vérifier qu’elle appartient au joueur ;
6. vérifier qu’elle n’est pas déjà dans l’équipe ;
7. vérifier qu’elle n’est pas `non_echangeable` ;
8. insérer dans `annonces_marche` ;
9. renvoyer `201`.

**Appelé par** :
- `mes-joueurs.js`

### 11.13 `DELETE /api/marketplace/annonces/:id`

**But** : retirer son annonce.

**Ordre** :
1. lire l’annonce ;
2. vérifier qu’elle existe ;
3. vérifier que le vendeur connecté est bien le vendeur ;
4. supprimer l’annonce.

**Appelé par** :
- `marche.js`

### 11.14 `POST /api/marketplace/annonces/:id/acheter`

**But** : acheter une carte à un autre joueur.

**Ordre exact** :
1. démarrer une transaction SQL ;
2. verrouiller l’annonce avec `FOR UPDATE` ;
3. vérifier qu’elle existe ;
4. interdire l’auto-achat ;
5. verrouiller le portefeuille de l’acheteur ;
6. vérifier les crédits ;
7. débiter l’acheteur ;
8. créditer le vendeur ;
9. supprimer la carte de toute équipe ;
10. transférer la propriété de la carte ;
11. supprimer l’annonce ;
12. commiter ;
13. relire le portefeuille acheteur et renvoyer le solde.

**Appelé par** :
- `marche.js`

---

## 12) Backend — fonctions utilitaires de `server.js`

Voici le rôle de chaque fonction et **où elle est appelée**.

### 12.1 `recupererImageJoueurCachee(playerId, imageUrl)`
- rôle : lire l’image dans le cache local, sinon la télécharger puis la stocker ;
- appelée par : route `GET /player-image/:id`.

### 12.2 `trouverExtensionImage(imageUrl)`
- rôle : déduire l’extension (`jpg`, `webp`, `gif`, `svg`, `png`) depuis l’URL ;
- appelée par : `recupererImageJoueurCachee(...)`.

### 12.3 `trouverContentTypeDepuisExtension(extension)`
- rôle : convertir une extension en MIME type ;
- appelée par : `recupererImageJoueurCachee(...)`.

### 12.4 `envoyerImageJoueurParDefaut(res)`
- rôle : renvoyer un SVG par défaut si aucune vraie image n’est disponible ;
- appelée par : route `GET /player-image/:id`.

### 12.5 `lireCookies(cookieHeader)`
- rôle : transformer l’en-tête `Cookie` en objet JavaScript ;
- appelée par : middleware de session.

### 12.6 `attendJson(req)`
- rôle : deviner si le client attend une réponse JSON ;
- appelée par : `POST /login` et `gererEchecAuth(...)`.

### 12.7 `creerSession(user)`
- rôle : générer un `sid`, l’enregistrer dans `sessions` et retourner ce `sid` ;
- appelée par : `POST /login`.

### 12.8 `poserCookieSession(res, sid)`
- rôle : écrire le cookie HTTP `sid` ;
- appelée par : `POST /login`.

### 12.9 `supprimerCookieSession(res)`
- rôle : invalider le cookie côté navigateur ;
- appelée par : `POST /logout`.

### 12.10 `gererEchecAuth(req, res, message)`
- rôle : centraliser la réponse en cas d’échec de connexion ;
- appelée par : `POST /login`.

### 12.11 `avecTransaction(work)`
- rôle : créer une transaction SQL avec `beginTransaction / commit / rollback` ;
- appelée par :
  - `POST /api/inscription`
  - `ouvrirPack(...)`
  - `POST /api/marketplace/annonces/:id/acheter`

### 12.12 `trouverUtilisateurParPseudo(pseudo)`
- rôle : lire l’utilisateur en base ;
- appelée par :
  - `POST /login`
  - `POST /api/inscription`

### 12.13 `recupererOuCreerPortefeuille(userId)`
- rôle : lire le portefeuille ou le créer si absent ;
- appelée par :
  - `GET /api/moi/credits`
  - `POST /api/moi/credits/regenerer`

### 12.14 `creerEquipeDepart(conn, userId)`
- rôle : créer l’équipe de base non échangeable ;
- appelée par : `POST /api/inscription` dans la transaction.

### 12.15 `transformerLigneCartePourVue(row)`
- rôle : convertir une ligne SQL carte en objet front propre ;
- appelée par :
  - `recupererCartesUtilisateur(...)`
  - `recupererEquipe(...)`
  - `ouvrirPack(...)`
  - `transformerLigneAnnoncePourVue(...)`

### 12.16 `transformerLigneAnnoncePourVue(row)`
- rôle : convertir une ligne SQL annonce en objet front ;
- appelée par : route `GET /api/marketplace`.

### 12.17 `recupererCartesUtilisateur(userId)`
- rôle : renvoyer toutes les cartes du joueur ;
- appelée par : `GET /api/moi/cartes`.

### 12.18 `recupererEquipe(userId)`
- rôle : reconstruire l’équipe par lignes `gardiens / defenseurs / milieux / attaquants` ;
- appelée par :
  - `GET /api/moi/equipe`
  - après ajout carte équipe
  - après retrait carte équipe

### 12.19 `tirerQualite(pack)`
- rôle : tirer `bronze / argent / or` selon les pourcentages du pack ;
- appelée par : `ouvrirPack(...)`.

### 12.20 `ouvrirPack(userId, packId)`
- rôle : vraie logique d’ouverture du pack ;
- appelée par : le job `setImmediate(...)` déclenché dans `POST /api/packs/:id/ouvrir`.

---

## 13) Frontend — principe général

Le frontend actif est un **frontend statique multi-pages**.

Chaque page suit la même logique :
- elle charge son CSS ;
- elle ajoute `<div id="tp-header"></div>` ;
- elle charge `header.js` ;
- elle charge ensuite le script spécifique de la page.

`header.js` est donc un morceau commun partagé par toutes les pages du jeu sauf les pages d’authentification.

---

## 14) Frontend — pages d’authentification

### 14.1 `frontend/public/auth/login.html`

Rôle : page de connexion.

Contient :
- un formulaire `id="login"`
- `action="/login"`
- `method="post"`
- deux champs : pseudo et mot de passe
- un lien vers l’inscription
- `login.js`

Important :
- le formulaire est soumis de manière **native HTML** au backend ;
- `login.js` ne remplace pas cette soumission par un `fetch`, il sert surtout à l’UX.

### 14.2 `frontend/public/auth/login.js`

#### `getResponseKind(res)`
Devine le type de réponse : JSON, HTML, login-page, unauthorized, autre.

#### `canAutoLogin()`
Teste si une session existe déjà :
- `fetch('/api/moi')`
- `fetch('/api/moi/credits')`

Si les deux répondent correctement en JSON, on considère l’utilisateur déjà connecté.

#### IIFE de démarrage
Ordre exact :
1. appelle `canAutoLogin()` ;
2. si vrai -> redirection vers `/accueil.html` ;
3. sinon -> lit les paramètres d’URL (`?error` ou `?logout`) ;
4. affiche le message correspondant.

#### Listener submit
Au moment du submit, il efface juste le message d’erreur.

### 14.3 `frontend/public/auth/register.html`

Rôle : page d’inscription.

Contient :
- un formulaire `id="register"`
- `action="/api/inscription"`
- `method="post"`
- `register.js`

### 14.4 `frontend/public/auth/register.js`

#### Listener `submit`
Ordre exact :
1. `preventDefault()` ;
2. lire le formulaire avec `FormData` ;
3. construire `{ pseudo, mdp }` ;
4. envoyer `fetch('/api/inscription', { method:'POST', body: JSON.stringify(data) })` ;
5. lire le JSON réponse ;
6. si erreur -> afficher `errorDiv.textContent` ;
7. si succès -> `showToast('Compte créé')` ;
8. reset du formulaire ;
9. redirection vers `/login` après 1.2 seconde.

#### `showToast(message)`
Affiche le petit message temporaire.

---

## 15) Frontend — `header.js`

`frontend/public/js/header.js` est un script auto-exécuté.

### 15.1 Rôle général

Il :
- injecte le HTML du header ;
- injecte la navigation ;
- détecte la page active ;
- charge pseudo + crédits ;
- met à jour les crédits régulièrement ;
- gère le bouton `+ crédits` ;
- gère le bouton `Déconnexion`.

### 15.2 Ordre exact au chargement

Quand la page charge `header.js` :
1. le script cherche `#tp-header` ;
2. si absent -> il s’arrête ;
3. s’il existe -> il injecte quelques styles minimums ;
4. il remplit `#tp-header` avec le HTML du header + la nav ;
5. il branche les boutons de navigation ;
6. il détecte la page active depuis `window.location.pathname` ;
7. il définit ses fonctions internes ;
8. il appelle `chargerInfosUtilisateur()` ;
9. il appelle `demarrerRafraichissementHeader()` ;
10. il branche le bouton régénération ;
11. il branche le bouton logout.

### 15.3 Fonctions internes

#### `determinerTypeReponse(reponse)`
Devine si la réponse est JSON, login, HTML, etc.

#### `recupererJsonSecurise(url, options)`
Fait un fetch sécurisé :
- envoie le cookie ;
- redirige vers `/login` si session expirée ;
- lève une erreur si la réponse n’est pas OK.

#### `chargerInfosUtilisateur()`
Appelle :
- `/api/moi`
- `/api/moi/credits`

Puis met à jour :
- `#pseudo`
- `#money`

#### `demarrerRafraichissementHeader()`
Relance `chargerInfosUtilisateur()` toutes les 5 secondes et quand l’onglet redevient visible.

---

## 16) Frontend — page `accueil.html`

### 16.1 Rôle
Afficher l’équipe actuelle sur un terrain simple.

### 16.2 `frontend/public/js/accueil.js`

#### `creerImageJoueurParDefaut()`
Retourne un SVG inline si l’image du joueur casse.

#### `donnerImageJoueur(joueur)`
Retourne `/player-image/:id` si possible, sinon l’URL brute.

#### `genererCarteJoueur(carte)`
Construit l’HTML d’une carte affichée sur le terrain.

#### `genererLigne(classeLigne, cartes)`
Construit une ligne du terrain (`attaque`, `milieu`, `defense`, `gardien`).

#### `chargerEquipe()`
Ordre exact :
1. fetch `/api/moi/equipe` ;
2. si `401` -> redirection `/login` ;
3. lire le JSON ;
4. concaténer toutes les cartes ;
5. si équipe vide -> message ;
6. sinon -> générer les 4 lignes du terrain.

#### `demarrerRafraichissementEquipe()`
Rafraîchit l’équipe toutes les 4 secondes + lors du retour sur l’onglet.

#### Démarrage réel
En bas du fichier :
- `chargerEquipe()`
- `demarrerRafraichissementEquipe()`

---

## 17) Frontend — page `boutique.html`

### 17.1 Rôle
Afficher les packs et gérer leur ouverture animée.

### 17.2 `frontend/public/js/boutique.js`

#### `attendre(ms)`
Petite pause asynchrone via `Promise`.

#### `creerImageJoueurParDefaut()`
Image SVG fallback.

#### `donnerImageJoueur(joueur)`
Choisit la meilleure source d’image.

#### `determinerTypeReponse(reponse)`
Devine si la réponse est JSON, login, etc.

#### `recupererJsonSecurise(url, options)`
Fetch sécurisé réutilisable dans la boutique.

#### `bloquerBoutonsAchat(estBloque)`
Désactive/active les boutons d’achat pendant l’ouverture d’un pack.

#### `changerEtatExperience(classeEtat, titre, texte)`
Met à jour la grande zone visuelle d’ouverture du pack.

#### `genererCarteReveal(carte)`
Construit la carte révélée après ouverture.

#### `rafraichirCredits()`
Relit `/api/moi/credits` et met à jour `#money`.

#### `chargerCorrespondancePacks()`
Lit `/api/packs` puis associe les packs SQL aux boutons visuels `bronze / silver / gold`.

#### `attendrePackPret(uuid)`
Fait du polling :
- appelle `/api/packs/:uuid`
- attend `READY`
- lève une erreur si `FAILED`
- abandonne si trop long.

#### `jouerAnimationPack(nomPack)`
Enchaîne les états visuels avant la révélation.

#### IIFE de démarrage
Ordre exact :
1. charger correspondance des packs ;
2. charger crédits ;
3. brancher les boutons `.btn-buy` ;
4. au clic :
   - identifier le pack choisi ;
   - bloquer les boutons ;
   - `POST /api/packs/:id/ouvrir` ;
   - jouer l’animation ;
   - appeler `attendrePackPret(uuid)` ;
   - afficher les cartes gagnées ;
   - rafraîchir les crédits ;
   - débloquer les boutons.

---

## 18) Frontend — page `composition.html`

### 18.1 Rôle
Composer l’équipe 4-4-2 en déplaçant des cartes entre le banc et le terrain.

### 18.2 États globaux du fichier

- `idCarteBancSelectionnee` : carte sélectionnée au clic ;
- `cartesCachees` : toutes les cartes du joueur ;
- `equipeCachee` : équipe actuelle ;
- `idCarteGlissee` : carte en cours de drag ;
- `glisseDepuisEquipe` : indique si le drag commence depuis le terrain ;
- `rechercheBanc` : texte de recherche ;
- `filtrePosteBanc` : filtre poste ;
- `timerComposition` : intervalle auto-refresh ;
- `requeteCompositionEnCours` : garde anti-concurrence.

### 18.3 Fonctions principales

#### `echapperHtml(valeur)`
Sécurise l’affichage du texte.

#### `creerImageJoueurParDefaut()`
Fallback image.

#### `donnerImageJoueur(joueur)`
Retourne la bonne image.

#### `genererCarteBanc(carte)`
Construit la carte HTML dans le banc.

#### `genererCaseTerrain(carte, poste)`
Construit une case du terrain : vide ou occupée.

#### `extrairePosteDepuisCase(caseTerrain)`
Lit `data-position="ATT1"` puis retourne `ATT`.

#### `remplirCases(cartes, selecteur)`
Remplit une ligne de slots avec les cartes données.

#### `recupererCartesEquipe()`
Aplatit `attaquants + milieux + defenseurs + gardiens` en un seul tableau.

#### `trouverCarteParId(idCarte)`
Cherche la carte dans le banc ou l’équipe.

#### `recupererCartesBanc()`
Retourne seulement les cartes qui ne sont pas sur le terrain.

#### `recupererCartesBancFiltrees()`
Applique recherche + filtre de poste au banc.

#### `rafraichirBanc()`
Redessine la zone banc.

#### `reinitialiserDrag()`
Nettoie l’état visuel/logique du drag and drop.

#### `marquerEtatCase(caseTerrain, estValide)`
Affiche visuellement une case valide ou invalide.

#### `depotValideSurCase(caseTerrain, carte)`
Vérifie que le poste de la carte correspond au poste de la case.

#### `ajouterCarteEquipe(idCarte, poste)`
Appelle `POST /api/moi/equipe/cartes`.

#### `retirerCarteEquipe(idCarte)`
Appelle `DELETE /api/moi/equipe/cartes/:id`.

#### `placerCarteDansCase(idCarte, caseTerrain)`
C’est la fonction centrale de placement.

Ordre exact :
1. lire le poste cible ;
2. retrouver la carte ;
3. vérifier qu’elle existe ;
4. vérifier qu’elle correspond au poste ;
5. voir si la case est déjà occupée ;
6. si vide -> ajouter directement ;
7. si occupée par la même carte -> ne rien faire ;
8. si occupée par une autre carte -> faire un mini swap :
   - retirer l’ancienne ;
   - essayer d’ajouter la nouvelle ;
   - en cas d’échec, remettre l’ancienne.

#### `gererClicDocument(event)`
Gère :
- clic sur “Retirer” ;
- clic sur une carte du banc ;
- clic sur une case du terrain quand une carte du banc est sélectionnée.

#### `gererDebutDrag(event)`
Démarre le drag depuis le banc ou depuis le terrain.

#### `gererSurvolDrag(event)`
Montre les zones où le drop est possible.

#### `gererSortieDrag(event)`
Nettoie les effets visuels quand on quitte une zone.

#### `gererDepot(event)`
Termine le drop soit :
- sur le terrain ;
- soit de retour vers le banc.

#### `gererFinDrag()`
Nettoie l’état de drag.

#### `chargerComposition(options)`
Ordre exact :
1. si une requête est déjà en cours -> sortir ;
2. fetch en parallèle :
   - `/api/moi/equipe`
   - `/api/moi/cartes`
3. si session expirée -> `/login` ;
4. mettre à jour `equipeCachee` et `cartesCachees` ;
5. remplir toutes les lignes du terrain ;
6. rafraîchir le banc.

#### `demarrerRafraichissementComposition()`
Relance `chargerComposition({ silent:true })` toutes les 4 secondes.

#### IIFE `injecterStylesComposition()`
Ajoute quelques styles CSS dynamiques liés au drag & drop.

### 18.4 Démarrage réel
En bas du fichier :
- branchement de la recherche du banc ;
- branchement du filtre poste ;
- listeners document globaux (`click`, `dragstart`, `dragover`, `dragleave`, `drop`, `dragend`) ;
- `chargerComposition()` ;
- `demarrerRafraichissementComposition()`.

---

## 19) Frontend — page `marche.html`

### 19.1 Rôle
Afficher les annonces, permettre l’achat et le retrait d’annonce.

### 19.2 `frontend/public/js/marche.js`

#### États globaux
- `utilisateurCourant`
- `toutesLesAnnonces`
- `rechercheMarche`
- `filtrePosteMarche`
- `timerMarche`
- `requeteMarcheEnCours`

#### `creerImageJoueurParDefaut()`
Fallback image.

#### `donnerImageJoueur(joueur)`
Retourne la bonne image.

#### `afficherAnnoncesMarche()`
Filtre les annonces puis les rend en HTML.

Point important :
- si `annonce.vendeurId === utilisateurCourant.id`, le bouton devient “Retirer” ;
- sinon le bouton devient “Acheter”.

#### `chargerAnnoncesMarche(options)`
Ordre exact :
1. fetch en parallèle :
   - `/api/marketplace`
   - `/api/moi`
2. si session expirée -> `/login` ;
3. stocker `utilisateurCourant` et `toutesLesAnnonces` ;
4. appeler `afficherAnnoncesMarche()`.

#### `demarrerRafraichissementMarche()`
Rafraîchit le marché toutes les 2 secondes.

#### `acheterAnnonce(idAnnonce, prix)`
Ordre exact :
1. demander confirmation ;
2. `POST /api/marketplace/annonces/:id/acheter` ;
3. lire le JSON ;
4. si erreur -> `alert` ;
5. si succès -> message, recharger le marché, puis recharger les crédits du header.

#### `retirerAnnonce(idAnnonce)`
Ordre exact :
1. demander confirmation ;
2. `DELETE /api/marketplace/annonces/:id` ;
3. si succès -> recharger le marché.

#### Démarrage réel
En bas du fichier :
- listener recherche ;
- listener filtre poste ;
- `chargerAnnoncesMarche()` ;
- `demarrerRafraichissementMarche()`.

---

## 20) Frontend — page `mes-joueurs.html`

### 20.1 Rôle
Afficher la collection du joueur et permettre la mise en vente.

### 20.2 `frontend/public/js/mes-joueurs.js`

#### États globaux
- `toutesLesCartes`
- `rechercheCourante`
- `filtrePosteCourant`
- `timerMesJoueurs`
- `requeteMesJoueursEnCours`

#### `creerImageJoueurParDefaut()`
Fallback image.

#### `donnerImageJoueur(joueur)`
Retourne la bonne image.

#### `afficherCartes()`
Filtre la collection puis génère les cartes HTML.

Règle importante :
- si `carte.nonEchangeable === true`, le bouton vendre est désactivé ;
- sinon le bouton appelle `mettreCarteEnVente(id)`.

#### `chargerMesCartes(options)`
Ordre exact :
1. fetch `/api/moi/cartes` ;
2. si session expirée -> `/login` ;
3. stocker `toutesLesCartes` ;
4. fetch `/api/moi/credits` ;
5. mettre à jour `#money` ;
6. appeler `afficherCartes()`.

#### `demarrerRafraichissementMesCartes()`
Rafraîchit toutes les 4 secondes.

#### `mettreCarteEnVente(idCarte)`
Ordre exact :
1. demander le prix via `prompt()` ;
2. refuser si vide ou <= 0 ;
3. `POST /api/marketplace/annonces` ;
4. si succès -> `alert`, puis recharger les cartes.

#### Démarrage réel
En bas du fichier :
- listener recherche ;
- listener filtre poste ;
- `chargerMesCartes()` ;
- `demarrerRafraichissementMesCartes()`.

---

## 21) Les scénarios complets, étape par étape

### 21.1 Scénario : connexion

```text
1. L’utilisateur ouvre /login
2. login.html s’affiche
3. login.js teste si une session existe déjà
4. Si non, l’utilisateur remplit le formulaire
5. Le navigateur envoie POST /login (formulaire natif)
6. server.js vérifie le pseudo
7. server.js compare le mot de passe avec bcrypt
8. server.js crée un sid dans sessions
9. server.js pose le cookie sid
10. server.js redirige vers /accueil.html
11. accueil.html charge header.js et accueil.js
12. header.js appelle /api/moi + /api/moi/credits
13. accueil.js appelle /api/moi/equipe
14. L’équipe s’affiche
```

### 21.2 Scénario : inscription

```text
1. L’utilisateur ouvre /register
2. register.html s’affiche
3. register.js intercepte le submit
4. register.js envoie POST /api/inscription
5. server.js valide pseudo + mot de passe
6. server.js vérifie que le pseudo n’existe pas déjà
7. server.js hashe le mot de passe
8. Transaction SQL
9. Insertion utilisateur
10. Création portefeuille
11. Création ligne d’équipe
12. Création équipe de départ non échangeable
13. Réponse 201
14. register.js affiche "Compte créé"
15. Redirection vers /login
```

### 21.3 Scénario : ouverture de pack

```text
1. L’utilisateur clique sur Acheter dans boutique.html
2. boutique.js trouve le pack SQL correspondant
3. boutique.js appelle POST /api/packs/:id/ouvrir
4. server.js crée un uuid de job
5. server.js place le job en PENDING dans packJobs
6. server.js lance setImmediate -> ouvrirPack(...)
7. server.js répond immédiatement avec { uuid }
8. boutique.js démarre l’animation
9. boutique.js poll /api/packs/:uuid
10. ouvrirPack() débite les crédits
11. ouvrirPack() tire les qualités
12. ouvrirPack() choisit des joueurs uniques
13. ouvrirPack() crée les cartes SQL
14. packJobs[uuid] passe à READY
15. boutique.js récupère les cartes
16. boutique.js affiche les cartes révélées
17. boutique.js relit les crédits
```

### 21.4 Scénario : ajout d’un joueur à l’équipe

```text
1. composition.js charge l’équipe et toutes les cartes
2. Le joueur clique ou glisse une carte du banc
3. composition.js détecte le poste de la case cible
4. composition.js appelle POST /api/moi/equipe/cartes
5. server.js vérifie propriété + poste + limite
6. server.js insère dans equipes_cartes
7. server.js renvoie la nouvelle équipe
8. composition.js recharge la composition
9. Le terrain et le banc se mettent à jour
```

### 21.5 Scénario : vente d’une carte

```text
1. L’utilisateur ouvre mes-joueurs.html
2. mes-joueurs.js charge la collection
3. L’utilisateur clique sur Vendre
4. mes-joueurs.js demande un prix
5. mes-joueurs.js appelle POST /api/marketplace/annonces
6. server.js vérifie propriété + pas dans l’équipe + échangeable
7. server.js insère dans annonces_marche
8. mes-joueurs.js recharge la collection
9. La carte disparaît du club disponible et apparaît au marché
```

### 21.6 Scénario : achat sur le marché

```text
1. L’utilisateur ouvre marche.html
2. marche.js charge les annonces et /api/moi
3. L’utilisateur clique sur Acheter
4. marche.js appelle POST /api/marketplace/annonces/:id/acheter
5. server.js démarre une transaction SQL
6. server.js verrouille l’annonce et le portefeuille acheteur
7. server.js débite l’acheteur
8. server.js crédite le vendeur
9. server.js transfère la carte
10. server.js supprime l’annonce
11. server.js renvoie le nouveau crédit acheteur
12. marche.js recharge le marché et les crédits du header
```

---

## 22) Base de données — tables utiles au projet

### `utilisateurs`
Stocke les comptes.

Colonnes utiles :
- `id`
- `pseudo`
- `mdp`

### `portefeuilles`
Stocke les crédits par utilisateur.

Colonnes utiles :
- `utilisateur_id`
- `credits`

### `equipes`
Stocke la formation.

Colonnes utiles :
- `utilisateur_id`
- `formation`

### `equipes_cartes`
Lie une carte à une place d’équipe.

Colonnes utiles :
- `utilisateur_id`
- `poste`
- `carte_id`

### `joueurs`
Catalogue global des joueurs disponibles dans les packs.

Colonnes utiles :
- `id`
- `nom`
- `poste`
- `note`
- `qualite`
- `image_url`
- `nationalite`
- `club`

### `cartes`
Cartes possédées par les utilisateurs.

Colonnes utiles côté code :
- `id`
- `utilisateur_id`
- `joueur_id`
- `non_echangeable` **(attendue par le code actuel)**

### `types_packs`
Définit les packs disponibles.

Colonnes utiles :
- `id`
- `nom`
- `prix`
- `nb_cartes`
- `pct_bronze`
- `pct_argent`
- `pct_or`

### `annonces_marche`
Stocke les cartes mises en vente.

Colonnes utiles :
- `id`
- `carte_id`
- `vendeur_id`
- `prix`

---

## 23) Point critique à connaître : `non_echangeable`

Le code actuel utilise clairement la colonne `cartes.non_echangeable` pour :
- créer les cartes de départ non échangeables ;
- empêcher leur vente ;
- renvoyer `nonEchangeable` au frontend.

Mais le dump SQL fourni ici ne montre **pas** cette colonne dans `CREATE TABLE cartes`.

Conclusion très importante :
- soit ta base distante réelle contient déjà cette colonne ;
- soit le dump n’est pas parfaitement à jour par rapport à la base réellement utilisée.

Si quelqu’un recrée la base uniquement à partir du dump fourni, il faudra probablement ajouter :

```sql
ALTER TABLE cartes
ADD COLUMN non_echangeable TINYINT(1) NOT NULL DEFAULT 0;
```

Sinon les routes liées au marché et à l’équipe de départ ne correspondront pas au code actuel.

---

## 24) Limites techniques actuelles du projet

### 24.1 Sessions en mémoire
Les sessions sont stockées dans `Map()` côté serveur.

Conséquence :
- si Node redémarre, tout le monde est déconnecté.

### 24.2 Pack jobs en mémoire
Les jobs d’ouverture de packs sont aussi en mémoire.

Conséquence :
- si le serveur redémarre pendant l’ouverture d’un pack, l’UUID est perdu.

### 24.3 Beaucoup de logique dans `server.js`
Le projet fonctionne, mais tout est centralisé dans un seul gros fichier backend.

Conséquence :
- plus simple pour un TP petit/moyen ;
- moins propre pour un gros projet.

### 24.4 Polling régulier côté front
Plusieurs pages relisent les données automatiquement toutes les 2 à 5 secondes.

Conséquence :
- c’est simple ;
- mais ça envoie beaucoup de requêtes quand plusieurs onglets restent ouverts.

---

## 25) Ce qu’un développeur junior doit retenir absolument

Si tu dois retenir le projet en une logique claire, retiens ceci :

1. **`server.js` est le centre du backend.**
2. **`db.js` est la porte d’entrée vers la base distante.**
3. **`header.js` est le composant commun du frontend.**
4. **Chaque page active a son propre script métier.**
5. **Les pages parlent au backend via `fetch`.**
6. **Le backend parle à MySQL via le pool.**
7. **La session est un cookie `sid` + une Map en mémoire.**
8. **La boutique utilise un système de job + polling.**
9. **La composition d’équipe utilise `equipes_cartes`.**
10. **Le marché utilise `annonces_marche` + transactions SQL.**

---

## 26) Conclusion

Le projet final nettoyé est un jeu FIFA web simple construit autour de :
- un **backend Node/Express** ;
- un **frontend statique multi-pages** ;
- une **base MySQL distante** ;
- une **session maison par cookie** ;
- une logique de jeu basée sur :
  - packs,
  - cartes,
  - équipe,
  - marché,
  - crédits.

Le plus important pour comprendre le code est de suivre cette règle :

```text
Page HTML -> script JS de la page -> fetch API -> route Express -> requête SQL -> JSON -> mise à jour du DOM
```

Si tu comprends cette phrase, tu comprends la mécanique générale de tout le projet.
