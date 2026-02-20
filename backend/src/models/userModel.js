import pool from '../config/db.js';

async function createUser(pseudo, mdpHash) {
    let result;
    try {
        [result] = await pool.query(
            'INSERT INTO utilisateurs (pseudo, mdp) VALUES (?, ?)',
            [pseudo, mdpHash]
        );
    } catch (err) {
        console.error('Erreur de création de compte :', err);
    }
    return result;
}


async function findUserByPseudo(pseudo) {
    let rows;
    try {
        [rows] = await pool.query(
            'SELECT * FROM utilisateurs WHERE pseudo = ?',
            [pseudo]
        );
    } catch (err) {
        console.error('Erreur', err);
    }
    return rows[0];
}


export {createUser, findUserByPseudo};