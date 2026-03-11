import pool from '../config/db.js';
import { INITIAL_CREDITS } from '../config/constants.js';
import { attendJson } from './requestService.js';
import { avecTransaction } from './transactionService.js';
import { creerEquipeDepart } from './teamService.js';

export async function trouverUtilisateurParPseudo(pseudo) {
  const [rows] = await pool.query('SELECT id, pseudo, mdp FROM utilisateurs WHERE pseudo = ?', [pseudo]);
  return rows[0] || null;
}

export async function gererEchecAuth(req, res, message) {
  if (await attendJson(req)) {
    return res.status(400).json({ message });
  }
  return res.redirect('/login?error');
}

export async function inscrireUtilisateur(pseudo, mdp) {
  const bcrypt = await import('bcrypt');
  const hash = await bcrypt.default.hash(mdp, 10);

  const userId = await avecTransaction(async (conn) => {
    const [result] = await conn.query(
      'INSERT INTO utilisateurs (pseudo, mdp) VALUES (?, ?)',
      [pseudo, hash]
    );
    const newUserId = Number(result.insertId);

    await conn.query(
      'INSERT INTO portefeuilles (utilisateur_id, credits) VALUES (?, ?)',
      [newUserId, INITIAL_CREDITS]
    );
    await conn.query(
      'INSERT INTO equipes (utilisateur_id, formation) VALUES (?, ?)',
      [newUserId, '4-4-2']
    );
    await creerEquipeDepart(conn, newUserId);
    return newUserId;
  });

  return { id: userId, pseudo };
}