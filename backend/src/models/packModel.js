import pool from '../config/db.js';

export async function getAllPackTypes() {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM types_packs ORDER BY prix ASC'
        );
        return rows;
    } catch (err) {
        console.error('Erreur getAllPackTypes:', err);
        throw err;
    }
}

export async function getPackTypeById(packId) {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM types_packs WHERE id = ?',
            [packId]
        );
        return rows[0] || null;
    } catch (err) {
        console.error('Erreur getPackTypeById:', err);
        throw err;
    }
}

export async function getRandomPlayersByQuality(quality, count = 1) {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM joueurs WHERE qualite = ? ORDER BY RAND() LIMIT ?',
            [quality, count]
        );
        return rows;
    } catch (err) {
        console.error('Erreur getRandomPlayersByQuality:', err);
        throw err;
    }
}
