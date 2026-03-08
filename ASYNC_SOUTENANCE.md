# Version async-first du projet TP FIFA

## Ce qui a été rendu asynchrone côté serveur
- middleware de lecture de session
- routes `/`, `/login`, `/register`, `/logout`
- route `/api/moi`
- route `/api/packs/:uuid`
- helpers de session / cookies
- helpers de transformation des cartes / annonces
- tirage de qualité du pack
- service d'image joueur par cache local

## Ce que vous pouvez dire en soutenance
> Notre projet suit une architecture async-first : tous les traitements applicatifs côté serveur sont gérés de façon asynchrone, et le frontend communique avec l'API via fetch, async/await et polling pour l'ouverture des packs.

> Le point le plus visible est l'ouverture de pack : la requête lance une tâche, reçoit un UUID immédiatement, puis récupère le résultat plus tard sans bloquer l'interface.

## Formulation précise à utiliser
Dire :
- "tous les échanges front-back et tous les accès base de données sont asynchrones"
- "l'ouverture des packs est un vrai traitement asynchrone métier"
- "les mises à jour d'interface se font sans rechargement complet de page"

Éviter de dire :
- "absolument chaque ligne de code est asynchrone"
- "le navigateur n'a aucun traitement synchrone"

## Pourquoi ne pas asyncifier chaque helper de rendu front
Parce qu'un générateur HTML pur ou une fonction de fallback d'image ne fait ni I/O ni attente. Le rendre async n'apporte rien et peut compliquer inutilement le front.
