import pool from '../config/db.js';
import { INITIAL_CREDITS, REGEN_CREDITS } from '../config/constants.js';

export async function recupererOuCreerPortefeuille(userId) {
  const [rows] = await pool.query('SELECT utilisateur_id, credits FROM portefeuilles WHERE utilisateur_id = ?', [userId]);
  if (rows[0]) return rows[0];
  await pool.query('INSERT INTO portefeuilles (utilisateur_id, credits) VALUES (?, ?)', [userId, INITIAL_CREDITS]);
  return { utilisateur_id: userId, credits: INITIAL_CREDITS };
}

export async function regenererCredits(userId) {
  await pool.query(
    'UPDATE portefeuilles SET credits = credits + ? WHERE utilisateur_id = ?',
    [REGEN_CREDITS, userId]
  );
  return recupererOuCreerPortefeuille(userId);
}