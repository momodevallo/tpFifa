# TP FIFA sans Spring Boot

Version nettoyée du projet :
- **Spring Boot supprimé**
- **backend converti en Node.js / Express**
- **BDD distante conservée via MySQL**
- **frontend statique conservé**

## Fonctionnalités gardées
- inscription / connexion
- session par cookie
- crédits au démarrage
- bouton de régénération de crédits
- ouverture de packs
- collection de cartes
- marketplace : vendre / acheter
- composition d'équipe (4-4-2)

## Lancer le projet
```bash
cd backend
npm install
npm start
```

Puis ouvrir :
- `http://localhost:8000/login`

## Variables d'environnement
Le fichier `.env` contient la connexion MySQL distante actuelle.
Un modèle est aussi fourni dans `.env.example`.

## Fichiers importants
- `backend/src/server.js` : serveur Express + routes API
- `backend/src/config/db.js` : connexion MySQL
- `frontend/public/` : pages HTML/CSS/JS
- `hm502200_fifa.sql` : dump SQL
