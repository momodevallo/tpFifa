import pool from '../config/db.js';

export async function getUserCards(userId) {
    try {
        const [rows] = await pool.query(
            `SELECT c.id as carte_id, c.utilisateur_id, c.joueur_id,
                    j.nom, j.poste, j.note, j.qualite, j.image_url, j.nationalite, j.club
             FROM cartes c
             JOIN joueurs j ON c.joueur_id = j.id
             WHERE c.utilisateur_id = ?
             ORDER BY j.note DESC, j.nom ASC`,
            [userId]
        );
        return rows;
    } catch (err) {
        console.error('Erreur getUserCards:', err);
        throw err;
    }
}

export async function addCardToUser(userId, joueurId) {
    try {
        const [result] = await pool.query(
            'INSERT INTO cartes (utilisateur_id, joueur_id) VALUES (?, ?)',
            [userId, joueurId]
        );
        return result.insertId;
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            throw new Error('Vous possédez déjà ce joueur');
        }
        console.error('Erreur addCardToUser:', err);
        throw err;
    }
}

export async function removeCardFromUser(carteId, userId) {
    try {
        const [result] = await pool.query(
            'DELETE FROM cartes WHERE id = ? AND utilisateur_id = ?',
            [carteId, userId]
        );
        return result.affectedRows > 0;
    } catch (err) {
        console.error('Erreur removeCardFromUser:', err);
        throw err;
    }
}

export async function getCardById(carteId) {
    try {
        const [rows] = await pool.query(
            `SELECT c.id as carte_id, c.utilisateur_id, c.joueur_id,
                    j.nom, j.poste, j.note, j.qualite, j.image_url, j.nationalite, j.club
             FROM cartes c
             JOIN joueurs j ON c.joueur_id = j.id
             WHERE c.id = ?`,
            [carteId]
        );
        return rows[0] || null;
    } catch (err) {
        console.error('Erreur getCardById:', err);
        throw err;
    }
}

export async function userOwnsCard(userId, carteId) {
    try {
        const [rows] = await pool.query(
            'SELECT id FROM cartes WHERE id = ? AND utilisateur_id = ?',
            [carteId, userId]
        );
        return rows.length > 0;
    } catch (err) {
        console.error('Erreur userOwnsCard:', err);
        throw err;
    }
}
