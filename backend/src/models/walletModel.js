import pool from '../config/db.js';

export async function getWallet(userId) {
    try {
        const [rows] = await pool.query(
            'SELECT credits FROM portefeuilles WHERE utilisateur_id = ?',
            [userId]
        );
        return rows[0] || null;
    } catch (err) {
        console.error('Erreur getWallet:', err);
        throw err;
    }
}

export async function createWallet(userId, initialCredits = 10000) {
    try {
        await pool.query(
            'INSERT INTO portefeuilles (utilisateur_id, credits) VALUES (?, ?)',
            [userId, initialCredits]
        );
        return { credits: initialCredits };
    } catch (err) {
        console.error('Erreur createWallet:', err);
        throw err;
    }
}

export async function getOrCreateWallet(userId) {
    let wallet = await getWallet(userId);
    if (!wallet) {
        wallet = await createWallet(userId);
    }
    return wallet;
}

export async function updateCredits(userId, amount) {
    try {
        const [result] = await pool.query(
            'UPDATE portefeuilles SET credits = credits + ? WHERE utilisateur_id = ?',
            [amount, userId]
        );
        return result.affectedRows > 0;
    } catch (err) {
        console.error('Erreur updateCredits:', err);
        throw err;
    }
}

export async function hasEnoughCredits(userId, amount) {
    const wallet = await getOrCreateWallet(userId);
    return wallet.credits >= amount;
}
