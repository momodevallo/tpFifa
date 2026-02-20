import pool from '../config/db.js';

export async function findPlayerById(id) {
    let rows;
    try {
        [rows] = await pool.query(
            'SELECT * FROM joueurs WHERE id = ?',
            [id]
        );
    } catch (err) {
        console.error('Erreur findPlayerById :', err);
        return null;
    }
    return rows[0] || null;
}
