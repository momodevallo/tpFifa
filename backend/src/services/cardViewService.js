import pool from '../config/db.js';

export async function transformerLigneCartePourVue(row) {
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

export async function recupererCartesUtilisateur(userId) {
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
  return Promise.all(rows.map((row) => transformerLigneCartePourVue(row)));
}