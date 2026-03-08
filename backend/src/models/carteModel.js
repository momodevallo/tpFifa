import pool from '../config/db.js';

// Retourne toutes les cartes d'un utilisateur.
export async function recupererCartesUtilisateur(userId) {
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
    } catch (erreur) {
        console.error('Erreur recupererCartesUtilisateur:', erreur);
        throw erreur;
    }
}

// Ajoute une carte à l'utilisateur.
export async function ajouterCarteUtilisateur(userId, joueurId) {
    try {
        const [result] = await pool.query(
            'INSERT INTO cartes (utilisateur_id, joueur_id) VALUES (?, ?)',
            [userId, joueurId]
        );
        return result.insertId;
    } catch (erreur) {
        if (erreur.code === 'ER_DUP_ENTRY') {
            throw new Error('Vous possédez déjà ce joueur');
        }
        console.error('Erreur ajouterCarteUtilisateur:', erreur);
        throw erreur;
    }
}

// Supprime une carte d'un utilisateur.
export async function supprimerCarteUtilisateur(carteId, userId) {
    try {
        const [result] = await pool.query(
            'DELETE FROM cartes WHERE id = ? AND utilisateur_id = ?',
            [carteId, userId]
        );
        return result.affectedRows > 0;
    } catch (erreur) {
        console.error('Erreur supprimerCarteUtilisateur:', erreur);
        throw erreur;
    }
}

// Cherche une carte précise par son id.
export async function recupererCarteParId(carteId) {
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
    } catch (erreur) {
        console.error('Erreur recupererCarteParId:', erreur);
        throw erreur;
    }
}

// Vérifie qu'une carte appartient bien à un utilisateur.
export async function carteAppartientUtilisateur(userId, carteId) {
    try {
        const [rows] = await pool.query(
            'SELECT id FROM cartes WHERE id = ? AND utilisateur_id = ?',
            [carteId, userId]
        );
        return rows.length > 0;
    } catch (erreur) {
        console.error('Erreur carteAppartientUtilisateur:', erreur);
        throw erreur;
    }
}
