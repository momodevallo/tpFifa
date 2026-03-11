import pool from '../config/db.js';
import { packJobs } from '../state/runtime.js';
import { avecTransaction } from './transactionService.js';
import { transformerLigneCartePourVue } from './cardViewService.js';

export async function tirerQualite(pack) {
  const chance = Math.floor(Math.random() * 100);
  if (chance < Number(pack.pct_bronze)) return 'bronze';
  if (chance < Number(pack.pct_bronze) + Number(pack.pct_argent)) return 'argent';
  return 'or';
}

export async function ouvrirPack(userId, packId) {
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

    await conn.query(
      'UPDATE portefeuilles SET credits = credits - ? WHERE utilisateur_id = ?',
      [pack.prix, userId]
    );

    const cards = [];
    const packPlayerIds = new Set();

    for (let i = 0; i < Number(pack.nb_cartes); i++) {
      const quality = await tirerQualite(pack);
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

        created = await transformerLigneCartePourVue({
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

export async function creerJobOuverturePack(userId, packId, uuid) {
  packJobs.set(uuid, { uuid, statut: 'PENDING', message: 'Pack en cours', cartes: [] });

  setImmediate(async () => {
    try {
      const cards = await ouvrirPack(userId, packId);
      packJobs.set(uuid, { uuid, statut: 'READY', message: 'Pack prêt', cartes: cards });
    } catch (error) {
      console.error('Erreur ouverture pack:', error);
      packJobs.set(uuid, {
        uuid,
        statut: 'FAILED',
        message: error.message || 'Erreur pack',
        cartes: []
      });
    }
  });

  return { uuid };
}

export async function recupererJobPack(uuid) {
  return packJobs.get(uuid) || null;
}

export async function recupererTypesPacks() {
  const [rows] = await pool.query('SELECT * FROM types_packs ORDER BY prix ASC');

  return rows.map((pack) => ({
    id: Number(pack.id),
    nom: pack.nom,
    prix: Number(pack.prix),
    nbCartes: Number(pack.nb_cartes),
    pctBronze: Number(pack.pct_bronze),
    pctArgent: Number(pack.pct_argent),
    pctOr: Number(pack.pct_or)
  }));
}