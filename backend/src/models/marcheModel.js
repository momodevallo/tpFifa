import pool from '../config/db.js';

export async function getAllMarketListings() {
    try {
        const [rows] = await pool.query(
            `SELECT am.id as annonce_id, am.carte_id, am.vendeur_id, am.prix,
                    u.pseudo as vendeur_pseudo,
                    j.id as joueur_id, j.nom, j.poste, j.note, j.qualite, j.image_url, j.nationalite, j.club
             FROM annonces_marche am
             JOIN cartes c ON am.carte_id = c.id
             JOIN joueurs j ON c.joueur_id = j.id
             JOIN utilisateurs u ON am.vendeur_id = u.id
             ORDER BY am.prix ASC, j.note DESC`
        );
        return rows;
    } catch (err) {
        console.error('Erreur getAllMarketListings:', err);
        throw err;
    }
}

export async function createMarketListing(carteId, vendeurId, prix) {
    try {
        const [result] = await pool.query(
            'INSERT INTO annonces_marche (carte_id, vendeur_id, prix) VALUES (?, ?, ?)',
            [carteId, vendeurId, prix]
        );
        return result.insertId;
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            throw new Error('Cette carte est déjà en vente');
        }
        console.error('Erreur createMarketListing:', err);
        throw err;
    }
}

export async function removeMarketListing(annonceId) {
    try {
        const [result] = await pool.query(
            'DELETE FROM annonces_marche WHERE id = ?',
            [annonceId]
        );
        return result.affectedRows > 0;
    } catch (err) {
        console.error('Erreur removeMarketListing:', err);
        throw err;
    }
}

export async function getMarketListingById(annonceId) {
    try {
        const [rows] = await pool.query(
            `SELECT am.id as annonce_id, am.carte_id, am.vendeur_id, am.prix,
                    u.pseudo as vendeur_pseudo,
                    j.id as joueur_id, j.nom, j.poste, j.note, j.qualite, j.image_url
             FROM annonces_marche am
             JOIN cartes c ON am.carte_id = c.id
             JOIN joueurs j ON c.joueur_id = j.id
             JOIN utilisateurs u ON am.vendeur_id = u.id
             WHERE am.id = ?`,
            [annonceId]
        );
        return rows[0] || null;
    } catch (err) {
        console.error('Erreur getMarketListingById:', err);
        throw err;
    }
}

export async function removeMarketListingByCardId(carteId) {
    try {
        const [result] = await pool.query(
            'DELETE FROM annonces_marche WHERE carte_id = ?',
            [carteId]
        );
        return result.affectedRows > 0;
    } catch (err) {
        console.error('Erreur removeMarketListingByCardId:', err);
        throw err;
    }
}
