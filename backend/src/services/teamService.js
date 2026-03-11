import pool from '../config/db.js';
import { TEAM_LIMITS } from '../config/constants.js';
import { transformerLigneCartePourVue } from './cardViewService.js';

export async function creerEquipeDepart(conn, userId) {
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

export async function recupererEquipe(userId) {
  const [teamRows] = await pool.query(
    'SELECT formation FROM equipes WHERE utilisateur_id = ?',
    [userId]
  );

  const formation = teamRows[0]?.formation || '4-4-2';

  const [rows] = await pool.query(
    `SELECT c.id AS carte_id, c.joueur_id, c.non_echangeable, 1 AS en_equipe, j.nom, j.poste, j.qualite, j.note, j.image_url, j.nationalite, j.club
     FROM equipes_cartes ec
     JOIN cartes c ON c.id = ec.carte_id
     JOIN joueurs j ON j.id = c.joueur_id
     WHERE ec.utilisateur_id = ?
     ORDER BY FIELD(ec.poste, 'GB', 'DEF', 'MIL', 'ATT'), j.note DESC, c.id ASC`,
    [userId]
  );

  const cards = await Promise.all(rows.map((row) => transformerLigneCartePourVue(row)));

  return {
    formation,
    gardiens: cards.filter((card) => card.joueur.poste === 'GB'),
    defenseurs: cards.filter((card) => card.joueur.poste === 'DEF'),
    milieux: cards.filter((card) => card.joueur.poste === 'MIL'),
    attaquants: cards.filter((card) => card.joueur.poste === 'ATT')
  };
}

export async function ajouterCarteEquipe(userId, carteId, poste) {
  if (!carteId || !TEAM_LIMITS[poste]) {
    const err = new Error('carteId et poste valides requis');
    err.status = 400;
    throw err;
  }

  const [cards] = await pool.query(
    `SELECT c.id, c.utilisateur_id, c.joueur_id, j.poste
     FROM cartes c
     JOIN joueurs j ON j.id = c.joueur_id
     WHERE c.id = ?`,
    [carteId]
  );

  const card = cards[0];

  if (!card) {
    const err = new Error('Carte introuvable');
    err.status = 404;
    throw err;
  }

  if (Number(card.utilisateur_id) !== userId) {
    const err = new Error('Cette carte ne t’appartient pas');
    err.status = 403;
    throw err;
  }

  if (card.poste !== poste) {
    const err = new Error('Le joueur ne correspond pas au poste demandé');
    err.status = 400;
    throw err;
  }

  const [[{ count }]] = await pool.query(
    'SELECT COUNT(*) AS count FROM equipes_cartes WHERE utilisateur_id = ? AND poste = ?',
    [userId, poste]
  );

  if (Number(count) >= TEAM_LIMITS[poste]) {
    const err = new Error(`Limite atteinte pour le poste ${poste}`);
    err.status = 400;
    throw err;
  }

  const [[existsRow]] = await pool.query(
    'SELECT COUNT(*) AS count FROM equipes_cartes WHERE utilisateur_id = ? AND carte_id = ?',
    [userId, carteId]
  );

  if (Number(existsRow.count) > 0) {
    const err = new Error('Cette carte est déjà dans l’équipe');
    err.status = 400;
    throw err;
  }

  await pool.query(
    'INSERT INTO equipes_cartes (utilisateur_id, poste, carte_id) VALUES (?, ?, ?)',
    [userId, poste, carteId]
  );

  return recupererEquipe(userId);
}

export async function retirerCarteEquipe(userId, carteId) {
  await pool.query(
    'DELETE FROM equipes_cartes WHERE utilisateur_id = ? AND carte_id = ?',
    [userId, carteId]
  );

  return recupererEquipe(userId);
}