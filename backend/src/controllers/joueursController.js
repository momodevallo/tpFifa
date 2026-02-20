import pool from '../config/db.js';
import { getPackTypeById } from '../models/packModel.js';
import { getOrCreateWallet, updateCredits, hasEnoughCredits } from '../models/walletModel.js';
import { addCardToUser } from '../models/carteModel.js';

export async function openPack(req, res) {
    try {
        const { userId, packId } = req.body;

        if (!userId || !packId) {
            return res.status(400).json({ message: 'userId et packId requis' });
        }

        const packType = await getPackTypeById(packId);
        if (!packType) {
            return res.status(404).json({ message: 'Pack non trouvé' });
        }

        const hasCredits = await hasEnoughCredits(userId, packType.prix);
        if (!hasCredits) {
            return res.status(400).json({ message: 'Crédits insuffisants' });
        }

        await updateCredits(userId, -packType.prix);

        const cards = [];
        const { nb_cartes, pct_bronze, pct_argent, pct_or } = packType;

        for (let i = 0; i < nb_cartes; i++) {
            const rand = Math.random() * 100;
            let quality;
            
            if (rand < pct_bronze) {
                quality = 'bronze';
            } else if (rand < pct_bronze + pct_argent) {
                quality = 'argent';
            } else {
                quality = 'or';
            }

            const [players] = await pool.query(
                'SELECT * FROM joueurs WHERE qualite = ? ORDER BY RAND() LIMIT 1',
                [quality]
            );

            if (players.length > 0) {
                const player = players[0];
                try {
                    const carteId = await addCardToUser(userId, player.id);
                    cards.push({
                        carte_id: carteId,
                        ...player
                    });
                } catch (err) {
                    if (err.message.includes('déjà')) {
                        i--;
                        continue;
                    }
                    throw err;
                }
            }
        }

        const wallet = await getOrCreateWallet(userId);

        return res.status(200).json({
            message: 'Pack ouvert avec succès',
            cards,
            credits: wallet.credits
        });
    } catch (err) {
        console.error('Erreur openPack:', err);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
}
