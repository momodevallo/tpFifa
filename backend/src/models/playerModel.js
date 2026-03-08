import pool from '../config/db.js';

// Cherche un joueur à partir de son identifiant.
export async function trouverJoueurParId(id) {
    let rows;
    try {
        [rows] = await pool.query(
            'SELECT * FROM joueurs WHERE id = ?',
            [id]
        );
    } catch (erreur) {
        console.error('Erreur trouverJoueurParId :', erreur);
        return null;
    }

    return rows[0] || null;
}
