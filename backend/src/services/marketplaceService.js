import pool from '../config/db.js';
import { avecTransaction } from './transactionService.js';
import { recupererOuCreerPortefeuille } from './walletService.js';
import { transformerLigneCartePourVue } from './cardViewService.js';

export async function transformerLigneAnnoncePourVue(row) {
  return {
    id: Number(row.annonce_id),
    prix: Number(row.prix),
    vendeurId: Number(row.vendeur_id),
    vendeurPseudo: row.vendeur_pseudo,
    carte: await transformerLigneCartePourVue(row)
  };
}

export async function recupererAnnoncesMarketplace() {
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

  return Promise.all(rows.map((row) => transformerLigneAnnoncePourVue(row)));
}

export async function creerAnnonceMarketplace(userId, carteId, prix) {
  if (!carteId || !prix || prix <= 0) {
    const err = new Error('carteId et prix positifs requis');
    err.status = 400;
    throw err;
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

  if (Number(card.en_equipe) === 1) {
    const err = new Error('Retire d’abord cette carte de ton équipe');
    err.status = 400;
    throw err;
  }

  if (Number(card.non_echangeable) === 1) {
    const err = new Error('Cette carte n’est pas échangeable');
    err.status = 400;
    throw err;
  }

  await pool.query(
    'INSERT INTO annonces_marche (carte_id, vendeur_id, prix) VALUES (?, ?, ?)',
    [carteId, userId, prix]
  );

  return { message: 'Carte mise en vente' };
}

export async function supprimerAnnonceMarketplace(userId, annonceId) {
  const [rows] = await pool.query('SELECT * FROM annonces_marche WHERE id = ?', [annonceId]);
  const annonce = rows[0];

  if (!annonce) {
    const err = new Error('Annonce inconnue');
    err.status = 404;
    throw err;
  }

  if (Number(annonce.vendeur_id) !== userId) {
    const err = new Error('Ce n’est pas ton annonce');
    err.status = 403;
    throw err;
  }

  await pool.query('DELETE FROM annonces_marche WHERE id = ?', [annonceId]);

  return { message: 'Annonce supprimée' };
}

export async function acheterAnnonceMarketplace(userId, annonceId) {
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

    if (Number(annonce.vendeur_id) === userId) {
      const err = new Error('Tu ne peux pas acheter ta propre carte');
      err.status = 400;
      throw err;
    }

    const [walletRows] = await conn.query(
      'SELECT credits FROM portefeuilles WHERE utilisateur_id = ? FOR UPDATE',
      [userId]
    );

    const buyerWallet = walletRows[0];

    if (!buyerWallet || Number(buyerWallet.credits) < Number(annonce.prix)) {
      const err = new Error('Crédits insuffisants');
      err.status = 400;
      throw err;
    }

    await conn.query(
      'UPDATE portefeuilles SET credits = credits - ? WHERE utilisateur_id = ?',
      [annonce.prix, userId]
    );
    await conn.query(
      'UPDATE portefeuilles SET credits = credits + ? WHERE utilisateur_id = ?',
      [annonce.prix, annonce.vendeur_id]
    );
    await conn.query('DELETE FROM equipes_cartes WHERE carte_id = ?', [annonce.carte_id]);
    await conn.query('UPDATE cartes SET utilisateur_id = ? WHERE id = ?', [userId, annonce.carte_id]);
    await conn.query('DELETE FROM annonces_marche WHERE id = ?', [annonceId]);
  });

  const wallet = await recupererOuCreerPortefeuille(userId);
  return { message: 'Achat effectué', credits: Number(wallet.credits) };
}