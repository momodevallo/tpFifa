import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import pool from './config/db.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 8000);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.join(__dirname, '../..', 'frontend', 'public');

const sessions = new Map();
const packJobs = new Map();
const TEAM_LIMITS = { GB: 1, DEF: 4, MIL: 4, ATT: 2 };
const INITIAL_CREDITS = 5000;
const REGEN_CREDITS = 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, _res, next) => {
  req.cookies = parseCookies(req.headers.cookie || '');
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
      return handleAuthFailure(req, res, 'Pseudo ou mot de passe manquant');
    }

    const user = await findUserByPseudo(pseudo);
    if (!user) {
      return handleAuthFailure(req, res, 'Identifiants invalides');
    }

    const bcrypt = await import('bcrypt');
    const ok = await bcrypt.default.compare(mdp, user.mdp);
    if (!ok) {
      return handleAuthFailure(req, res, 'Identifiants invalides');
    }

    const sid = createSession({ id: Number(user.id), pseudo: user.pseudo });
    setSessionCookie(res, sid);

    if (wantsJson(req)) {
      return res.json({ message: 'Connexion réussie', userId: Number(user.id), pseudo: user.pseudo });
    }

    return res.redirect('/accueil.html');
  } catch (error) {
    console.error('Erreur login:', error);
    if (wantsJson(req)) {
      return res.status(500).json({ message: 'Erreur serveur' });
    }
    return res.redirect('/login?error');
  }
});

app.post('/logout', (req, res) => {
  const sid = req.cookies.sid;
  if (sid) sessions.delete(sid);
  clearSessionCookie(res);
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
    const existing = await findUserByPseudo(pseudo);
    if (existing) {
      return res.status(400).json({ message: 'Ce pseudo existe déjà' });
    }

    const bcrypt = await import('bcrypt');
    const hash = await bcrypt.default.hash(mdp, 10);

    const userId = await withTransaction(async (conn) => {
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
      await createStarterTeam(conn, newUserId);
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

app.get('/player-image/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT image_url FROM joueurs WHERE id = ?', [req.params.id]);
    const imageUrl = rows[0]?.image_url;
    if (!imageUrl) {
      return res.status(404).send('Image non trouvée');
    }
    return res.redirect(imageUrl);
  } catch (error) {
    console.error('Erreur player-image:', error);
    return res.status(500).send('Erreur image');
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

app.get('/api/moi/credits', async (req, res) => {
  try {
    const wallet = await getOrCreateWallet(req.session.id);
    res.json({ credits: Number(wallet.credits) });
  } catch (error) {
    console.error('Erreur credits:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.post('/api/moi/credits/regenerer', async (req, res) => {
  try {
    await pool.query(
      'UPDATE portefeuilles SET credits = credits + ? WHERE utilisateur_id = ?',
      [REGEN_CREDITS, req.session.id]
    );
    const wallet = await getOrCreateWallet(req.session.id);
    res.json({ credits: Number(wallet.credits) });
  } catch (error) {
    console.error('Erreur regen credits:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.get('/api/moi/cartes', async (req, res) => {
  try {
    const cards = await getUserCards(req.session.id);
    res.json(cards);
  } catch (error) {
    console.error('Erreur cartes:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.get('/api/moi/equipe', async (req, res) => {
  try {
    const team = await getTeam(req.session.id);
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

    res.json(await getTeam(req.session.id));
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
    res.json(await getTeam(req.session.id));
  } catch (error) {
    console.error('Erreur retrait carte équipe:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

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
      const cards = await openPack(req.session.id, packId);
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

app.get('/api/marketplace', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT am.id AS annonce_id, am.prix, am.vendeur_id, u.pseudo AS vendeur_pseudo,
              c.id AS carte_id, c.utilisateur_id, c.joueur_id,
              CASE WHEN ec.carte_id IS NULL THEN 0 ELSE 1 END AS en_equipe,
              j.nom, j.poste, j.qualite, j.note, j.image_url, j.nationalite, j.club
       FROM annonces_marche am
       JOIN cartes c ON c.id = am.carte_id
       JOIN joueurs j ON j.id = c.joueur_id
       JOIN utilisateurs u ON u.id = am.vendeur_id
       LEFT JOIN equipes_cartes ec ON ec.carte_id = c.id AND ec.utilisateur_id = c.utilisateur_id
       ORDER BY am.prix ASC, j.note DESC, j.nom ASC`
    );
    res.json(rows.map(mapListingRowToView));
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
      `SELECT c.id, c.utilisateur_id, CASE WHEN ec.carte_id IS NULL THEN 0 ELSE 1 END AS en_equipe
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

app.post('/api/marketplace/annonces/:id/acheter', async (req, res) => {
  try {
    const annonceId = Number(req.params.id);
    await withTransaction(async (conn) => {
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

    const wallet = await getOrCreateWallet(req.session.id);
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

app.listen(PORT, () => {
  console.log(`Serveur Node lancé sur http://localhost:${PORT}`);
});

function parseCookies(cookieHeader) {
  return cookieHeader.split(';').reduce((acc, part) => {
    const [rawKey, ...rest] = part.trim().split('=');
    if (!rawKey) return acc;
    acc[rawKey] = decodeURIComponent(rest.join('='));
    return acc;
  }, {});
}

function wantsJson(req) {
  const accept = String(req.headers.accept || '').toLowerCase();
  const contentType = String(req.headers['content-type'] || '').toLowerCase();
  return accept.includes('application/json') || contentType.includes('application/json');
}

function createSession(user) {
  const sid = crypto.randomUUID();
  sessions.set(sid, { ...user, createdAt: Date.now() });
  return sid;
}

function setSessionCookie(res, sid) {
  res.setHeader('Set-Cookie', `sid=${encodeURIComponent(sid)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`);
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', 'sid=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0');
}

function handleAuthFailure(req, res, message) {
  if (wantsJson(req)) {
    return res.status(400).json({ message });
  }
  return res.redirect('/login?error');
}

async function withTransaction(work) {
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

async function findUserByPseudo(pseudo) {
  const [rows] = await pool.query('SELECT id, pseudo, mdp FROM utilisateurs WHERE pseudo = ?', [pseudo]);
  return rows[0] || null;
}

async function getOrCreateWallet(userId) {
  const [rows] = await pool.query('SELECT utilisateur_id, credits FROM portefeuilles WHERE utilisateur_id = ?', [userId]);
  if (rows[0]) return rows[0];
  await pool.query('INSERT INTO portefeuilles (utilisateur_id, credits) VALUES (?, ?)', [userId, INITIAL_CREDITS]);
  return { utilisateur_id: userId, credits: INITIAL_CREDITS };
}

async function createStarterTeam(conn, userId) {
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

function mapCardRowToView(row) {
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

function mapListingRowToView(row) {
  return {
    id: Number(row.annonce_id),
    prix: Number(row.prix),
    vendeurId: Number(row.vendeur_id),
    vendeurPseudo: row.vendeur_pseudo,
    carte: mapCardRowToView(row)
  };
}

async function getUserCards(userId) {
  const [rows] = await pool.query(
    `SELECT c.id AS carte_id, c.utilisateur_id, c.joueur_id,
            CASE WHEN ec.carte_id IS NULL THEN 0 ELSE 1 END AS en_equipe,
            j.nom, j.poste, j.qualite, j.note, j.image_url, j.nationalite, j.club
     FROM cartes c
     JOIN joueurs j ON j.id = c.joueur_id
     LEFT JOIN equipes_cartes ec ON ec.carte_id = c.id AND ec.utilisateur_id = c.utilisateur_id
     WHERE c.utilisateur_id = ?
     ORDER BY j.note DESC, j.nom ASC`,
    [userId]
  );
  return rows.map(mapCardRowToView);
}

async function getTeam(userId) {
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
  const cards = rows.map(mapCardRowToView);
  return {
    formation,
    gardiens: cards.filter(card => card.joueur.poste === 'GB'),
    defenseurs: cards.filter(card => card.joueur.poste === 'DEF'),
    milieux: cards.filter(card => card.joueur.poste === 'MIL'),
    attaquants: cards.filter(card => card.joueur.poste === 'ATT')
  };
}

function drawQuality(pack) {
  const roll = Math.floor(Math.random() * 100);
  if (roll < Number(pack.pct_bronze)) return 'bronze';
  if (roll < Number(pack.pct_bronze) + Number(pack.pct_argent)) return 'argent';
  return 'or';
}

async function openPack(userId, packId) {
  return withTransaction(async (conn) => {
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
      const quality = drawQuality(pack);
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
        created = mapCardRowToView({
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
