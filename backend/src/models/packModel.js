import pool from '../config/db.js';

// Retourne tous les types de packs triés par prix.
export async function recupererTousLesTypesDePack() {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM types_packs ORDER BY prix ASC'
        );
        return rows;
    } catch (erreur) {
        console.error('Erreur recupererTousLesTypesDePack:', erreur);
        throw erreur;
    }
}

// Retourne un pack précis à partir de son id.
export async function recupererTypePackParId(packId) {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM types_packs WHERE id = ?',
            [packId]
        );
        return rows[0] || null;
    } catch (erreur) {
        console.error('Erreur recupererTypePackParId:', erreur);
        throw erreur;
    }
}

// Tire au hasard un ou plusieurs joueurs d'une qualité donnée.
export async function recupererJoueursAleatoiresParQualite(qualite, count = 1) {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM joueurs WHERE qualite = ? ORDER BY RAND() LIMIT ?',
            [qualite, count]
        );
        return rows;
    } catch (erreur) {
        console.error('Erreur recupererJoueursAleatoiresParQualite:', erreur);
        throw erreur;
    }
}
