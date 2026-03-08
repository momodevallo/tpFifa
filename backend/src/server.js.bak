import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import pool from './config/db.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 8000);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.join(__dirname, '../..', 'frontend', 'public');
const imageCachePath = path.join(__dirname, '..', 'cache', 'player-images');

const sessions = new Map();
const packJobs = new Map();
// TEAM_LIMITS limite le nombre de joueurs par poste dans la composition.

const TEAM_LIMITS = { GB: 1, DEF: 4, MIL: 4, ATT: 2 };
const INITIAL_CREDITS = 5000;
const REGEN_CREDITS = 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Middleware maison pour lire la session à partir du cookie sid.
app.use((req, _res, next) => {
  req.cookies = lireCookies(req.headers.cookie || '');
  const sid = req.cookies.sid;
  req.session = sid && sessions.has(sid) ? sessions.get(sid) : null;
  next();
});

app.get('/', (req, res) => {
  res.redirect(req.session ? '/accueil.html' : '/login');
});

app.get('/login', (_req, res) => {
  res.sendFile(path.join(publicPath, 'auth', 'login.html'));
});

app.get('/register', (_req, res) => {
  res.sendFile(path.join(publicPath, 'auth', 'register.html'));
});

app.post('/login', async (req, res) => {
  try {
    const pseudo = String(req.body.pseudo || req.body.username || '').trim();
    const mdp = String(req.body.mdp || req.body.password || '');

    if (!pseudo || !mdp) {
      return gererEchecAuth(req, res, 'Pseudo ou mot de passe manquant');
    }

    const user = await trouverUtilisateurParPseudo(pseudo);
    if (!user) {
      return gererEchecAuth(req, res, 'Identifiants invalides');
    }

    const bcrypt = await import('bcrypt');
    const ok = await bcrypt.default.compare(mdp, user.mdp);
    if (!ok) {
      return gererEchecAuth(req, res, 'Identifiants invalides');
    }

    const sid = creerSession({ id: Number(user.id), pseudo: user.pseudo });
    poserCookieSession(res, sid);

    if (attendJson(req)) {
      return res.json({ message: 'Connexion réussie', userId: Number(user.id), pseudo: user.pseudo });
    }

    return res.redirect('/accueil.html');
  } catch (error) {
    console.error('Erreur login:', error);
    if (attendJson(req)) {
      return res.status(500).json({ message: 'Erreur serveur' });
    }
    return res.redirect('/login?error');
  }
});

app.post('/logout', (req, res) => {
  const sid = req.cookies.sid;
  if (sid) sessions.delete(sid);
  supprimerCookieSession(res);
  res.json({ message: 'Déconnexion réussie' });
});

app.post('/api/inscription', async (req, res) => {
  const pseudo = String(req.body.pseudo || '').trim();
  const mdp = String(req.body.mdp || '');

  if (!pseudo || !mdp) {
    return res.status(400).json({ message: 'Pseudo et mot de passe obligatoires' });
  }
  if (!/^[a-zA-Z0-9]+$/.test(pseudo)) {
    return res.status(400).json({ message: 'Le pseudo doit contenir uniquement des lettres et des chiffres' });
  }
  if (mdp.length < 8) {
    return res.status(400).json({ message: 'Mot de passe trop court (min 8 caractères)' });
  }

  try {
    const existing = await trouverUtilisateurParPseudo(pseudo);
    if (existing) {
      return res.status(400).json({ message: 'Ce pseudo existe déjà' });
    }

    const bcrypt = await import('bcrypt');
    const hash = await bcrypt.default.hash(mdp, 10);

    const userId = await avecTransaction(async (conn) => {
      const [result] = await conn.query(
        'INSERT INTO utilisateurs (pseudo, mdp) VALUES (?, ?)',
        [pseudo, hash]
      );
      const newUserId = Number(result.insertId);

      await conn.query(
        'INSERT INTO portefeuilles (utilisateur_id, credits) VALUES (?, ?)',
        [newUserId, INITIAL_CREDITS]
      );
      await conn.query(
        'INSERT INTO equipes (utilisateur_id, formation) VALUES (?, ?)',
        [newUserId, '4-4-2']
      );
      await creerEquipeDepart(conn, newUserId);
      return newUserId;
    });

    res.status(201).json({ id: userId, pseudo });
  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({ message: 'Erreur serveur pendant l’inscription' });
  }
});

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Sert une image de joueur mise en cache localement si possible.
app.get('/player-image/:id', async (req, res) => {
  try {
    const playerId = Number(req.params.id);
    if (!playerId) {
      return envoyerImageJoueurParDefaut(res);
    }

    const [rows] = await pool.query('SELECT image_url FROM joueurs WHERE id = ?', [playerId]);
    const imageUrl = String(rows[0]?.image_url || '').trim();

    if (!imageUrl) {
      return envoyerImageJoueurParDefaut(res);
    }

    const cache = await recupererImageJoueurCachee(playerId, imageUrl);
    if (cache) {
      res.type(cache.contentType);
      return res.send(cache.buffer);
    }

    return envoyerImageJoueurParDefaut(res);
  } catch (error) {
    console.error('Erreur player-image:', error);
    return envoyerImageJoueurParDefaut(res);
  }
});

app.use('/api', (req, res, next) => {
  if (req.path === '/inscription') return next();
  if (!req.session) return res.status(401).json({ message: 'Non authentifié' });
  next();
});

app.get('/api/moi', (req, res) => {
  res.json({ id: req.session.id, pseudo: req.session.pseudo });
});

// Retourne le nombre de crédits du joueur connecté.
app.get('/api/moi/credits', async (req, res) => {
  try {
    const wallet = await recupererOuCreerPortefeuille(req.session.id);
    res.json({ credits: Number(wallet.credits) });
  } catch (error) {
    console.error('Erreur credits:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Ajoute les crédits bonus au portefeuille du joueur.
app.post('/api/moi/credits/regenerer', async (req, res) => {
  try {
    await pool.query(
      'UPDATE portefeuilles SET credits = credits + ? WHERE utilisateur_id = ?',
      [REGEN_CREDITS, req.session.id]
    );
    const wallet = await recupererOuCreerPortefeuille(req.session.id);
    res.json({ credits: Number(wallet.credits) });
  } catch (error) {
    console.error('Erreur regen credits:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Retourne les cartes du joueur connecté.
app.get('/api/moi/cartes', async (req, res) => {
  try {
    const cards = await recupererCartesUtilisateur(req.session.id);
    res.json(cards);
  } catch (error) {
    console.error('Erreur cartes:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Retourne l'équipe courante du joueur connecté.
app.get('/api/moi/equipe', async (req, res) => {
  try {
    const team = await recupererEquipe(req.session.id);
    res.json(team);
  } catch (error) {
    console.error('Erreur équipe:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.post('/api/moi/equipe/cartes', async (req, res) => {
  try {
    const carteId = Number(req.body.carteId);
    const poste = String(req.body.poste || '').toUpperCase();
    if (!carteId || !TEAM_LIMITS[poste]) {
      return res.status(400).json({ message: 'carteId et poste valides requis' });
    }

    const [cards] = await pool.query(
      `SELECT c.id, c.utilisateur_id, c.joueur_id, j.poste
       FROM cartes c
       JOIN joueurs j ON j.id = c.joueur_id
       WHERE c.id = ?`,
      [carteId]
    );
    const card = cards[0];
    if (!card) return res.status(404).json({ message: 'Carte introuvable' });
    if (Number(card.utilisateur_id) !== req.session.id) {
      return res.status(403).json({ message: 'Cette carte ne t’appartient pas' });
    }
    if (card.poste !== poste) {
      return res.status(400).json({ message: 'Le joueur ne correspond pas au poste demandé' });
    }

    const [[{ count }]] = await pool.query(
      'SELECT COUNT(*) AS count FROM equipes_cartes WHERE utilisateur_id = ? AND poste = ?',
      [req.session.id, poste]
    );
    if (Number(count) >= TEAM_LIMITS[poste]) {
      return res.status(400).json({ message: `Limite atteinte pour le poste ${poste}` });
    }

    const [[existsRow]] = await pool.query(
      'SELECT COUNT(*) AS count FROM equipes_cartes WHERE utilisateur_id = ? AND carte_id = ?',
      [req.session.id, carteId]
    );
    if (Number(existsRow.count) > 0) {
      return res.status(400).json({ message: 'Cette carte est déjà dans l’équipe' });
    }

    await pool.query(
      'INSERT INTO equipes_cartes (utilisateur_id, poste, carte_id) VALUES (?, ?, ?)',
      [req.session.id, poste, carteId]
    );

    res.json(await recupererEquipe(req.session.id));
  } catch (error) {
    console.error('Erreur ajout carte équipe:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.delete('/api/moi/equipe/cartes/:carteId', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM equipes_cartes WHERE utilisateur_id = ? AND carte_id = ?',
      [req.session.id, Number(req.params.carteId)]
    );
    res.json(await recupererEquipe(req.session.id));
  } catch (error) {
    console.error('Erreur retrait carte équipe:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Liste les packs disponibles dans la boutique.
app.get('/api/packs', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM types_packs ORDER BY prix ASC');
    res.json(rows.map(pack => ({
      id: Number(pack.id),
      nom: pack.nom,
      prix: Number(pack.prix),
      nbCartes: Number(pack.nb_cartes),
      pctBronze: Number(pack.pct_bronze),
      pctArgent: Number(pack.pct_argent),
      pctOr: Number(pack.pct_or)
    })));
  } catch (error) {
    console.error('Erreur packs:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.post('/api/packs/:id/ouvrir', async (req, res) => {
  const packId = Number(req.params.id);
  if (!packId) return res.status(400).json({ message: 'Pack invalide' });

  const uuid = crypto.randomUUID();
  packJobs.set(uuid, { uuid, statut: 'PENDING', message: 'Pack en cours', cartes: [] });

  setImmediate(async () => {
    try {
      const cards = await ouvrirPack(req.session.id, packId);
      packJobs.set(uuid, { uuid, statut: 'READY', message: 'Pack prêt', cartes: cards });
    } catch (error) {
      console.error('Erreur ouverture pack:', error);
      packJobs.set(uuid, { uuid, statut: 'FAILED', message: error.message || 'Erreur pack', cartes: [] });
    }
  });

  res.json({ uuid });
});

app.get('/api/packs/:uuid', (req, res) => {
  const job = packJobs.get(req.params.uuid);
  if (!job) {
    return res.status(404).json({ message: 'UUID inconnu' });
  }
  if (job.statut === 'PENDING') {
    return res.status(206).json(job);
  }
  res.json(job);
});

// Retourne les annonces présentes sur le marché.
app.get('/api/marketplace', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT am.id AS annonce_id, am.prix, am.vendeur_id, u.pseudo AS vendeur_pseudo,
              c.id AS carte_id, c.utilisateur_id, c.joueur_id, c.non_echangeable,
              CASE WHEN ec.carte_id IS NULL THEN 0 ELSE 1 END AS en_equipe,
              j.nom, j.poste, j.qualite, j.note, j.image_url, j.nationalite, j.club
       FROM annonces_marche am
       JOIN cartes c ON c.id = am.carte_id
       JOIN joueurs j ON j.id = c.joueur_id
       JOIN utilisateurs u ON u.id = am.vendeur_id
       LEFT JOIN equipes_cartes ec ON ec.carte_id = c.id AND ec.utilisateur_id = c.utilisateur_id
       ORDER BY am.prix ASC, j.note DESC, j.nom ASC`
    );
    res.json(rows.map(transformerLigneAnnoncePourVue));
  } catch (error) {
    console.error('Erreur marketplace:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.post('/api/marketplace/annonces', async (req, res) => {
  try {
    const carteId = Number(req.body.carteId);
    const prix = Number(req.body.prix);
    if (!carteId || !prix || prix <= 0) {
      return res.status(400).json({ message: 'carteId et prix positifs requis' });
    }

    const [cards] = await pool.query(
      `SELECT c.id, c.utilisateur_id, c.non_echangeable,
              CASE WHEN ec.carte_id IS NULL THEN 0 ELSE 1 END AS en_equipe
       FROM cartes c
       LEFT JOIN equipes_cartes ec ON ec.carte_id = c.id AND ec.utilisateur_id = c.utilisateur_id
       WHERE c.id = ?`,
      [carteId]
    );
    const card = cards[0];
    if (!card) return res.status(404).json({ message: 'Carte introuvable' });
    if (Number(card.utilisateur_id) !== req.session.id) {
      return res.status(403).json({ message: 'Cette carte ne t’appartient pas' });
    }
    if (Number(card.en_equipe) === 1) {
      return res.status(400).json({ message: 'Retire d’abord cette carte de ton équipe' });
    }
    if (Number(card.non_echangeable) === 1) {
      return res.status(400).json({ message: 'Cette carte n’est pas échangeable' });
    }

    await pool.query(
      'INSERT INTO annonces_marche (carte_id, vendeur_id, prix) VALUES (?, ?, ?)',
      [carteId, req.session.id, prix]
    );

    res.status(201).json({ message: 'Carte mise en vente' });
  } catch (error) {
    console.error('Erreur mise en vente:', error);
    if (String(error.message || '').includes('Duplicate')) {
      return res.status(400).json({ message: 'Cette carte est déjà en vente' });
    }
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.delete('/api/marketplace/annonces/:id', async (req, res) => {
  try {
    const annonceId = Number(req.params.id);
    const [rows] = await pool.query('SELECT * FROM annonces_marche WHERE id = ?', [annonceId]);
    const annonce = rows[0];
    if (!annonce) return res.status(404).json({ message: 'Annonce inconnue' });
    if (Number(annonce.vendeur_id) !== req.session.id) {
      return res.status(403).json({ message: 'Ce n’est pas ton annonce' });
    }
    await pool.query('DELETE FROM annonces_marche WHERE id = ?', [annonceId]);
    res.json({ message: 'Annonce supprimée' });
  } catch (error) {
    console.error('Erreur suppression annonce:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Permet d'acheter une annonce marché en transaction SQL.
app.post('/api/marketplace/annonces/:id/acheter', async (req, res) => {
  try {
    const annonceId = Number(req.params.id);
    await avecTransaction(async (conn) => {
      const [rows] = await conn.query(
        `SELECT am.id, am.carte_id, am.vendeur_id, am.prix
         FROM annonces_marche am
         WHERE am.id = ? FOR UPDATE`,
        [annonceId]
      );
      const annonce = rows[0];
      if (!annonce) {
        const err = new Error('Annonce inconnue');
        err.status = 404;
        throw err;
      }
      if (Number(annonce.vendeur_id) === req.session.id) {
        const err = new Error('Tu ne peux pas acheter ta propre carte');
        err.status = 400;
        throw err;
      }

      const [walletRows] = await conn.query(
        'SELECT credits FROM portefeuilles WHERE utilisateur_id = ? FOR UPDATE',
        [req.session.id]
      );
      const buyerWallet = walletRows[0];
      if (!buyerWallet || Number(buyerWallet.credits) < Number(annonce.prix)) {
        const err = new Error('Crédits insuffisants');
        err.status = 400;
        throw err;
      }

      await conn.query('UPDATE portefeuilles SET credits = credits - ? WHERE utilisateur_id = ?', [annonce.prix, req.session.id]);
      await conn.query('UPDATE portefeuilles SET credits = credits + ? WHERE utilisateur_id = ?', [annonce.prix, annonce.vendeur_id]);
      await conn.query('DELETE FROM equipes_cartes WHERE carte_id = ?', [annonce.carte_id]);
      await conn.query('UPDATE cartes SET utilisateur_id = ? WHERE id = ?', [req.session.id, annonce.carte_id]);
      await conn.query('DELETE FROM annonces_marche WHERE id = ?', [annonceId]);
    });

    const wallet = await recupererOuCreerPortefeuille(req.session.id);
    res.json({ message: 'Achat effectué', credits: Number(wallet.credits) });
  } catch (error) {
    console.error('Erreur achat annonce:', error);
    res.status(error.status || 500).json({ message: error.message || 'Erreur serveur' });
  }
});

app.use(express.static(publicPath));

app.use((req, res) => {
  res.status(404).json({ message: 'Route introuvable' });
});

// Lance le serveur Express sur le port configuré.
app.listen(PORT, () => {
  console.log(`Serveur Node lancé sur http://localhost:${PORT}`);
});


// Télécharge puis met en cache local l'image d'un joueur.
async function recupererImageJoueurCachee(playerId, imageUrl) {
  try {
    await fs.mkdir(imageCachePath, { recursive: true });

    const extension = trouverExtensionImage(imageUrl);
    const cacheFilePath = path.join(imageCachePath, `${playerId}.${extension}`);

    try {
      const buffer = await fs.readFile(cacheFilePath);
      return {
        buffer,
        contentType: trouverContentTypeDepuisExtension(extension)
      };
    } catch (_error) {}

    const remoteRes = await fetch(imageUrl, {
      headers: {
        'user-agent': 'Mozilla/5.0 TP-FIFA/1.0',
        'accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    });

    if (!remoteRes.ok) {
      console.error('Erreur fetch image distante:', remoteRes.status, remoteRes.statusText, imageUrl);
      return null;
    }

    const arrayBuffer = await remoteRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = remoteRes.headers.get('content-type') || trouverContentTypeDepuisExtension(extension);

    await fs.writeFile(cacheFilePath, buffer);

    return {
      buffer,
      contentType
    };
  } catch (error) {
    console.error('Erreur cache image joueur:', error);
    return null;
  }
}

// Déduit l'extension probable d'une image à partir de son URL.
function trouverExtensionImage(imageUrl) {
  const cleanUrl = String(imageUrl || '').split('?')[0].toLowerCase();
  if (cleanUrl.endsWith('.jpg') || cleanUrl.endsWith('.jpeg')) return 'jpg';
  if (cleanUrl.endsWith('.webp')) return 'webp';
  if (cleanUrl.endsWith('.gif')) return 'gif';
  if (cleanUrl.endsWith('.svg')) return 'svg';
  return 'png';
}

// Retourne le content-type adapté à une extension d'image.
function trouverContentTypeDepuisExtension(extension) {
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'svg':
      return 'image/svg+xml';
    default:
      return 'image/png';
  }
}

// Envoie un avatar SVG par défaut quand aucune image n'est dispo.
function envoyerImageJoueurParDefaut(res) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#182848" />
          <stop offset="100%" stop-color="#4b6cb7" />
        </linearGradient>
      </defs>
      <rect width="240" height="240" rx="28" fill="url(#bg)"/>
      <circle cx="120" cy="88" r="38" fill="rgba(255,255,255,0.88)"/>
      <path d="M56 206c8-34 32-54 64-54s56 20 64 54" fill="rgba(255,255,255,0.88)"/>
      <text x="120" y="224" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="rgba(255,255,255,0.96)">JOUEUR</text>
    </svg>
  `;
  res.status(200).type('image/svg+xml').send(svg);
}

// Transforme l'en-tête Cookie en objet JavaScript simple.
function lireCookies(cookieHeader) {
  return cookieHeader.split(';').reduce((acc, part) => {
    const [rawKey, ...rest] = part.trim().split('=');
    if (!rawKey) return acc;
    acc[rawKey] = decodeURIComponent(rest.join('='));
    return acc;
  }, {});
}

// Détermine si le client attend une réponse JSON.
function attendJson(req) {
  const accept = String(req.headers.accept || '').toLowerCase();
  const contentType = String(req.headers['content-type'] || '').toLowerCase();
  return accept.includes('application/json') || contentType.includes('application/json');
}

// Crée une session en mémoire pour l'utilisateur connecté.
function creerSession(user) {
  const sid = crypto.randomUUID();
  sessions.set(sid, { ...user, createdAt: Date.now() });
  return sid;
}

// Pose le cookie HTTP qui identifie la session.
function poserCookieSession(res, sid) {
  res.setHeader('Set-Cookie', `sid=${encodeURIComponent(sid)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`);
}

// Supprime le cookie de session côté navigateur.
function supprimerCookieSession(res) {
  res.setHeader('Set-Cookie', 'sid=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0');
}

// Centralise la réponse envoyée lors d'un échec d'authentification.
function gererEchecAuth(req, res, message) {
  if (attendJson(req)) {
    return res.status(400).json({ message });
  }
  return res.redirect('/login?error');
}

// Exécute un bloc SQL dans une transaction atomique.
async function avecTransaction(work) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

// Cherche un utilisateur à partir de son pseudo.
async function trouverUtilisateurParPseudo(pseudo) {
  const [rows] = await pool.query('SELECT id, pseudo, mdp FROM utilisateurs WHERE pseudo = ?', [pseudo]);
  return rows[0] || null;
}

// Retourne le portefeuille d'un joueur, ou le crée si besoin.
async function recupererOuCreerPortefeuille(userId) {
  const [rows] = await pool.query('SELECT utilisateur_id, credits FROM portefeuilles WHERE utilisateur_id = ?', [userId]);
  if (rows[0]) return rows[0];
  await pool.query('INSERT INTO portefeuilles (utilisateur_id, credits) VALUES (?, ?)', [userId, INITIAL_CREDITS]);
  return { utilisateur_id: userId, credits: INITIAL_CREDITS };
}

// Crée automatiquement l'équipe de départ d'un nouveau compte.
async function creerEquipeDepart(conn, userId) {
  const starterPlan = [
    ['GB', 1],
    ['DEF', 4],
    ['MIL', 4],
    ['ATT', 2]
  ];

  for (const [poste, count] of starterPlan) {
    const [players] = await conn.query(
      `SELECT id FROM joueurs
       WHERE poste = ? AND qualite IN ('bronze', 'argent')
       ORDER BY RAND()
       LIMIT ?`,
      [poste, count]
    );

    if (players.length < count) {
      throw new Error(`Pas assez de joueurs pour créer l'équipe de base (${poste})`);
    }

    for (const player of players) {
      const [result] = await conn.query(
        'INSERT INTO cartes (utilisateur_id, joueur_id, non_echangeable) VALUES (?, ?, 1)',
        [userId, player.id]
      );
      await conn.query(
        'INSERT INTO equipes_cartes (utilisateur_id, poste, carte_id) VALUES (?, ?, ?)',
        [userId, poste, Number(result.insertId)]
      );
    }
  }
}

// Convertit une ligne SQL carte en objet pratique pour le front.
function transformerLigneCartePourVue(row) {
  return {
    id: Number(row.carte_id),
    nonEchangeable: Number(row.non_echangeable || 0) === 1,
    enEquipe: Number(row.en_equipe) === 1,
    joueur: {
      id: Number(row.joueur_id),
      nom: row.nom,
      poste: row.poste,
      qualite: row.qualite,
      note: Number(row.note),
      imageUrl: row.image_url,
      nationalite: row.nationalite,
      club: row.club
    }
  };
}

// Convertit une ligne SQL annonce en objet lisible côté front.
function transformerLigneAnnoncePourVue(row) {
  return {
    id: Number(row.annonce_id),
    prix: Number(row.prix),
    vendeurId: Number(row.vendeur_id),
    vendeurPseudo: row.vendeur_pseudo,
    carte: transformerLigneCartePourVue(row)
  };
}

// Récupère toutes les cartes possédées par un joueur.
async function recupererCartesUtilisateur(userId) {
  const [rows] = await pool.query(
    `SELECT c.id AS carte_id, c.utilisateur_id, c.joueur_id, c.non_echangeable,
            CASE WHEN ec.carte_id IS NULL THEN 0 ELSE 1 END AS en_equipe,
            j.nom, j.poste, j.qualite, j.note, j.image_url, j.nationalite, j.club
     FROM cartes c
     JOIN joueurs j ON j.id = c.joueur_id
     LEFT JOIN equipes_cartes ec ON ec.carte_id = c.id AND ec.utilisateur_id = c.utilisateur_id
     WHERE c.utilisateur_id = ?
     ORDER BY j.note DESC, j.nom ASC`,
    [userId]
  );
  return rows.map(transformerLigneCartePourVue);
}

// Récupère l'équipe complète structurée par lignes.
async function recupererEquipe(userId) {
  const [teamRows] = await pool.query('SELECT formation FROM equipes WHERE utilisateur_id = ?', [userId]);
  const formation = teamRows[0]?.formation || '4-4-2';
  const [rows] = await pool.query(
    `SELECT c.id AS carte_id, c.joueur_id, c.non_echangeable, 1 AS en_equipe,
            j.nom, j.poste, j.qualite, j.note, j.image_url, j.nationalite, j.club
     FROM equipes_cartes ec
     JOIN cartes c ON c.id = ec.carte_id
     JOIN joueurs j ON j.id = c.joueur_id
     WHERE ec.utilisateur_id = ?
     ORDER BY FIELD(ec.poste, 'GB', 'DEF', 'MIL', 'ATT'), j.note DESC, c.id ASC`,
    [userId]
  );
  const cards = rows.map(transformerLigneCartePourVue);
  return {
    formation,
    gardiens: cards.filter(card => card.joueur.poste === 'GB'),
    defenseurs: cards.filter(card => card.joueur.poste === 'DEF'),
    milieux: cards.filter(card => card.joueur.poste === 'MIL'),
    attaquants: cards.filter(card => card.joueur.poste === 'ATT')
  };
}

// Tire la qualité d'une carte selon les pourcentages du pack.
function tirerQualite(pack) {
  const roll = Math.floor(Math.random() * 100);
  if (roll < Number(pack.pct_bronze)) return 'bronze';
  if (roll < Number(pack.pct_bronze) + Number(pack.pct_argent)) return 'argent';
  return 'or';
}

// Ouvre un pack, retire les crédits puis crée les cartes gagnées.
async function ouvrirPack(userId, packId) {
  return avecTransaction(async (conn) => {
    const [packRows] = await conn.query('SELECT * FROM types_packs WHERE id = ?', [packId]);
    const pack = packRows[0];
    if (!pack) throw new Error('Pack inconnu');

    const [walletRows] = await conn.query(
      'SELECT credits FROM portefeuilles WHERE utilisateur_id = ? FOR UPDATE',
      [userId]
    );
    const wallet = walletRows[0];
    if (!wallet) throw new Error('Portefeuille introuvable');
    if (Number(wallet.credits) < Number(pack.prix)) {
      throw new Error('Crédits insuffisants pour ouvrir ce pack');
    }

    await conn.query('UPDATE portefeuilles SET credits = credits - ? WHERE utilisateur_id = ?', [pack.prix, userId]);

    const cards = [];
    const packPlayerIds = new Set();

    for (let i = 0; i < Number(pack.nb_cartes); i++) {
      const quality = tirerQualite(pack);
      let created = null;

      for (let attempt = 0; attempt < 25 && !created; attempt++) {
        const [players] = await conn.query(
          'SELECT * FROM joueurs WHERE qualite = ? ORDER BY RAND() LIMIT 1',
          [quality]
        );
        const player = players[0];
        if (!player) throw new Error(`Aucun joueur disponible pour la qualité ${quality}`);

        if (packPlayerIds.has(Number(player.id))) continue;

        const [ownedRows] = await conn.query(
          'SELECT id FROM cartes WHERE utilisateur_id = ? AND joueur_id = ?',
          [userId, player.id]
        );
        if (ownedRows.length > 0) continue;

        const [result] = await conn.query(
          'INSERT INTO cartes (utilisateur_id, joueur_id) VALUES (?, ?)',
          [userId, player.id]
        );
        packPlayerIds.add(Number(player.id));
        created = transformerLigneCartePourVue({
          carte_id: Number(result.insertId),
          joueur_id: Number(player.id),
          en_equipe: 0,
          nom: player.nom,
          poste: player.poste,
          qualite: player.qualite,
          note: Number(player.note),
          image_url: player.image_url,
          nationalite: player.nationalite,
          club: player.club
        });
      }

      if (!created) {
        throw new Error('Impossible de tirer une carte unique pour ce pack');
      }
      cards.push(created);
    }

    return cards;
  });
}
