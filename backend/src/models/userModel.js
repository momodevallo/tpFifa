import pool from '../config/db.js';

// Crée un utilisateur dans la base.
async function creerUtilisateur(pseudo, mdpHash) {
    let result;
    try {
        [result] = await pool.query(
            'INSERT INTO utilisateurs (pseudo, mdp) VALUES (?, ?)',
            [pseudo, mdpHash]
        );
    } catch (erreur) {
        console.error('Erreur de création de compte :', erreur);
    }
    return result;
}

// Cherche un utilisateur grâce à son pseudo.
async function trouverUtilisateurParPseudo(pseudo) {
    let rows;
    try {
        [rows] = await pool.query(
            'SELECT * FROM utilisateurs WHERE pseudo = ?',
            [pseudo]
        );
    } catch (erreur) {
        console.error('Erreur trouverUtilisateurParPseudo :', erreur);
    }
    return rows?.[0];
}

export { creerUtilisateur, trouverUtilisateurParPseudo };
