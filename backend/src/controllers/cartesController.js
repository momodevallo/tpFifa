import { getUserCards } from '../models/carteModel.js';
import { getOrCreateWallet } from '../models/walletModel.js';

export async function getMyCards(req, res) {
    try {
        const userId = req.query.userId || req.body.userId;
        
        if (!userId) {
            return res.status(400).json({ message: 'userId requis' });
        }

        const cards = await getUserCards(userId);
        const wallet = await getOrCreateWallet(userId);

        return res.status(200).json({ 
            cards,
            credits: wallet.credits
        });
    } catch (err) {
        console.error('Erreur getMyCards:', err);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
}
