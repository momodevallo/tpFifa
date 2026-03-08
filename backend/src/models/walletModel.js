import pool from '../config/db.js';

// Retourne le portefeuille d'un utilisateur.
export async function recupererPortefeuille(userId) {
    try {
        const [rows] = await pool.query(
            'SELECT credits FROM portefeuilles WHERE utilisateur_id = ?',
            [userId]
        );
        return rows[0] || null;
    } catch (erreur) {
        console.error('Erreur recupererPortefeuille:', erreur);
        throw erreur;
    }
}

// Crée un portefeuille avec un solde initial.
export async function creerPortefeuille(userId, creditsInitiaux = 10000) {
    try {
        await pool.query(
            'INSERT INTO portefeuilles (utilisateur_id, credits) VALUES (?, ?)',
            [userId, creditsInitiaux]
        );
        return { credits: creditsInitiaux };
    } catch (erreur) {
        console.error('Erreur creerPortefeuille:', erreur);
        throw erreur;
    }
}

// Retourne le portefeuille s'il existe, sinon le crée.
export async function recupererOuCreerPortefeuille(userId) {
    let portefeuille = await recupererPortefeuille(userId);

    if (!portefeuille) {
        portefeuille = await creerPortefeuille(userId);
    }

    return portefeuille;
}

// Ajoute ou retire des crédits au portefeuille.
export async function modifierCredits(userId, montant) {
    try {
        const [result] = await pool.query(
            'UPDATE portefeuilles SET credits = credits + ? WHERE utilisateur_id = ?',
            [montant, userId]
        );
        return result.affectedRows > 0;
    } catch (erreur) {
        console.error('Erreur modifierCredits:', erreur);
        throw erreur;
    }
}

// Vérifie que l'utilisateur possède assez de crédits.
export async function possedeAssezDeCredits(userId, montant) {
    const portefeuille = await recupererOuCreerPortefeuille(userId);
    return portefeuille.credits >= montant;
}
