import pool from '../config/db.js';
import { getAllMarketListings, createMarketListing, getMarketListingById, removeMarketListing } from '../models/marcheModel.js';
import { getCardById, userOwnsCard, removeCardFromUser, addCardToUser } from '../models/carteModel.js';
import { getOrCreateWallet, updateCredits, hasEnoughCredits } from '../models/walletModel.js';

export async function getMarketListings(req, res) {
    try {
        const listings = await getAllMarketListings();
        return res.status(200).json({ listings });
    } catch (err) {
        console.error('Erreur getMarketListings:', err);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
}

export async function sellCard(req, res) {
    try {
        const { userId, carteId, prix } = req.body;

        if (!userId || !carteId || !prix) {
            return res.status(400).json({ message: 'userId, carteId et prix requis' });
        }

        if (prix <= 0) {
            return res.status(400).json({ message: 'Le prix doit être positif' });
        }

        const owns = await userOwnsCard(userId, carteId);
        if (!owns) {
            return res.status(403).json({ message: 'Vous ne possédez pas cette carte' });
        }

        const annonceId = await createMarketListing(carteId, userId, prix);

        return res.status(201).json({
            message: 'Carte mise en vente',
            annonceId
        });
    } catch (err) {
        if (err.message.includes('déjà en vente')) {
            return res.status(400).json({ message: err.message });
        }
        console.error('Erreur sellCard:', err);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
}

export async function buyCard(req, res) {
    const connection = await pool.getConnection();
    
    try {
        const { userId, annonceId } = req.body;

        if (!userId || !annonceId) {
            return res.status(400).json({ message: 'userId et annonceId requis' });
        }

        await connection.beginTransaction();

        const listing = await getMarketListingById(annonceId);
        if (!listing) {
            await connection.rollback();
            return res.status(404).json({ message: 'Annonce non trouvée' });
        }

        if (listing.vendeur_id === parseInt(userId)) {
            await connection.rollback();
            return res.status(400).json({ message: 'Vous ne pouvez pas acheter votre propre carte' });
        }

        const hasCredits = await hasEnoughCredits(userId, listing.prix);
        if (!hasCredits) {
            await connection.rollback();
            return res.status(400).json({ message: 'Crédits insuffisants' });
        }

        await updateCredits(userId, -listing.prix);
        await updateCredits(listing.vendeur_id, listing.prix);

        await connection.query(
            'UPDATE cartes SET utilisateur_id = ? WHERE id = ?',
            [userId, listing.carte_id]
        );

        await removeMarketListing(annonceId);

        await connection.commit();

        const wallet = await getOrCreateWallet(userId);

        return res.status(200).json({
            message: 'Carte achetée avec succès',
            credits: wallet.credits
        });
    } catch (err) {
        await connection.rollback();
        console.error('Erreur buyCard:', err);
        return res.status(500).json({ message: 'Erreur serveur' });
    } finally {
        connection.release();
    }
}
