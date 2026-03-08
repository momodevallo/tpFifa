import pool from '../config/db.js';
import { recupererToutesLesAnnonces, creerAnnonceMarche, recupererAnnonceParId, supprimerAnnonceMarche } from '../models/marcheModel.js';
import { carteAppartientUtilisateur } from '../models/carteModel.js';
import { recupererOuCreerPortefeuille, modifierCredits, possedeAssezDeCredits } from '../models/walletModel.js';

// Retourne toutes les annonces du marché.
export async function recupererAnnoncesMarche(req, res) {
    try {
        const annonces = await recupererToutesLesAnnonces();
        return res.status(200).json({ listings: annonces });
    } catch (erreur) {
        console.error('Erreur recupererAnnoncesMarche:', erreur);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
}

// Met une carte en vente sur le marché.
export async function vendreCarte(req, res) {
    try {
        const { userId, carteId, prix } = req.body;

        if (!userId || !carteId || !prix) {
            return res.status(400).json({ message: 'userId, carteId et prix requis' });
        }

        if (prix <= 0) {
            return res.status(400).json({ message: 'Le prix doit être positif' });
        }

        const possedeCarte = await carteAppartientUtilisateur(userId, carteId);
        if (!possedeCarte) {
            return res.status(403).json({ message: 'Vous ne possédez pas cette carte' });
        }

        const idAnnonce = await creerAnnonceMarche(carteId, userId, prix);

        return res.status(201).json({
            message: 'Carte mise en vente',
            annonceId: idAnnonce
        });
    } catch (erreur) {
        if (erreur.message.includes('déjà en vente')) {
            return res.status(400).json({ message: erreur.message });
        }
        console.error('Erreur vendreCarte:', erreur);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
}

// Achète une carte du marché avec transaction SQL.
export async function acheterCarte(req, res) {
    const connexion = await pool.getConnection();

    try {
        const { userId, annonceId } = req.body;

        if (!userId || !annonceId) {
            return res.status(400).json({ message: 'userId et annonceId requis' });
        }

        await connexion.beginTransaction();

        const annonce = await recupererAnnonceParId(annonceId);
        if (!annonce) {
            await connexion.rollback();
            return res.status(404).json({ message: 'Annonce non trouvée' });
        }

        if (annonce.vendeur_id === parseInt(userId, 10)) {
            await connexion.rollback();
            return res.status(400).json({ message: 'Vous ne pouvez pas acheter votre propre carte' });
        }

        const assezDeCredits = await possedeAssezDeCredits(userId, annonce.prix);
        if (!assezDeCredits) {
            await connexion.rollback();
            return res.status(400).json({ message: 'Crédits insuffisants' });
        }

        await modifierCredits(userId, -annonce.prix);
        await modifierCredits(annonce.vendeur_id, annonce.prix);

        await connexion.query(
            'UPDATE cartes SET utilisateur_id = ? WHERE id = ?',
            [userId, annonce.carte_id]
        );

        await supprimerAnnonceMarche(annonceId);
        await connexion.commit();

        const portefeuille = await recupererOuCreerPortefeuille(userId);

        return res.status(200).json({
            message: 'Carte achetée avec succès',
            credits: portefeuille.credits
        });
    } catch (erreur) {
        await connexion.rollback();
        console.error('Erreur acheterCarte:', erreur);
        return res.status(500).json({ message: 'Erreur serveur' });
    } finally {
        connexion.release();
    }
}
