import { recupererCartesUtilisateur } from '../models/carteModel.js';
import { recupererOuCreerPortefeuille } from '../models/walletModel.js';

// Retourne les cartes du joueur ainsi que son solde actuel.
export async function recupererMesCartes(req, res) {
    try {
        const idUtilisateur = req.query.userId || req.body.userId;

        if (!idUtilisateur) {
            return res.status(400).json({ message: 'userId requis' });
        }

        const cartes = await recupererCartesUtilisateur(idUtilisateur);
        const portefeuille = await recupererOuCreerPortefeuille(idUtilisateur);

        return res.status(200).json({
            cards: cartes,
            credits: portefeuille.credits
        });
    } catch (erreur) {
        console.error('Erreur recupererMesCartes:', erreur);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
}
