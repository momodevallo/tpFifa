import pool from '../config/db.js';
import { recupererTypePackParId } from '../models/packModel.js';
import { recupererOuCreerPortefeuille, modifierCredits, possedeAssezDeCredits } from '../models/walletModel.js';
import { ajouterCarteUtilisateur } from '../models/carteModel.js';

// Ouvre un pack, retire les crédits puis ajoute les cartes obtenues à l'utilisateur.
export async function ouvrirPackJoueur(req, res) {
    try {
        const { userId, packId } = req.body;

        if (!userId || !packId) {
            return res.status(400).json({ message: 'userId et packId requis' });
        }

        const typePack = await recupererTypePackParId(packId);
        if (!typePack) {
            return res.status(404).json({ message: 'Pack non trouvé' });
        }

        const assezDeCredits = await possedeAssezDeCredits(userId, typePack.prix);
        if (!assezDeCredits) {
            return res.status(400).json({ message: 'Crédits insuffisants' });
        }

        await modifierCredits(userId, -typePack.prix);

        const cartes = [];
        const { nb_cartes, pct_bronze, pct_argent } = typePack;

        for (let i = 0; i < nb_cartes; i++) {
            const tirage = Math.random() * 100;
            let qualite = 'or';

            if (tirage < pct_bronze) {
                qualite = 'bronze';
            } else if (tirage < pct_bronze + pct_argent) {
                qualite = 'argent';
            }

            const [joueurs] = await pool.query(
                'SELECT * FROM joueurs WHERE qualite = ? ORDER BY RAND() LIMIT 1',
                [qualite]
            );

            if (joueurs.length > 0) {
                const joueur = joueurs[0];

                try {
                    const idCarte = await ajouterCarteUtilisateur(userId, joueur.id);
                    cartes.push({
                        carte_id: idCarte,
                        ...joueur
                    });
                } catch (erreur) {
                    if (erreur.message.includes('déjà')) {
                        i--;
                        continue;
                    }
                    throw erreur;
                }
            }
        }

        const portefeuille = await recupererOuCreerPortefeuille(userId);

        return res.status(200).json({
            message: 'Pack ouvert avec succès',
            cards: cartes,
            credits: portefeuille.credits
        });
    } catch (erreur) {
        console.error('Erreur ouvrirPackJoueur:', erreur);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
}
