import express from 'express';
import crypto from 'crypto';
import { verifierSessionApi } from '../middleware/auth.js';
import { recupererOuCreerPortefeuille, regenererCredits } from '../services/walletService.js';
import { recupererCartesUtilisateur } from '../services/cardViewService.js';
import { recupererEquipe, ajouterCarteEquipe, retirerCarteEquipe } from '../services/teamService.js';
import { recupererTypesPacks, creerJobOuverturePack, recupererJobPack } from '../services/packService.js';
import {
  recupererAnnoncesMarketplace,
  creerAnnonceMarketplace,
  supprimerAnnonceMarketplace,
  acheterAnnonceMarketplace
} from '../services/marketplaceService.js';

const router = express.Router();

router.use(verifierSessionApi);

router.get('/moi', async (req, res) => {
  res.json({ id: req.session.id, pseudo: req.session.pseudo });
});

router.get('/moi/credits', async (req, res) => {
  try {
    const wallet = await recupererOuCreerPortefeuille(req.session.id);
    res.json({ credits: Number(wallet.credits) });
  } catch (error) {
    console.error('Erreur credits:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.post('/moi/credits/regenerer', async (req, res) => {
  try {
    const wallet = await regenererCredits(req.session.id);
    res.json({ credits: Number(wallet.credits) });
  } catch (error) {
    console.error('Erreur regen credits:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.get('/moi/cartes', async (req, res) => {
  try {
    const cards = await recupererCartesUtilisateur(req.session.id);
    res.json(cards);
  } catch (error) {
    console.error('Erreur cartes:', error);
    res.status(500).json({ message: 'erreur de serveur' });
  }
});

router.get('/moi/equipe', async (req, res) => {
  try {
    const team = await recupererEquipe(req.session.id);
    res.json(team);
  } catch (error) {
    console.error('Erreur équipe:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.post('/moi/equipe/cartes', async (req, res) => {
  try {
    const carteId = Number(req.body.carteId);
    const poste = String(req.body.poste || '').toUpperCase();
    const team = await ajouterCarteEquipe(req.session.id, carteId, poste);
    res.json(team);
  } catch (error) {
    console.error('Erreur ajout carte équipe:', error);
    res.status(error.status || 500).json({ message: error.message || 'Erreur serveur' });
  }
});

router.delete('/moi/equipe/cartes/:carteId', async (req, res) => {
  try {
    const team = await retirerCarteEquipe(req.session.id, Number(req.params.carteId));
    res.json(team);
  } catch (error) {
    console.error('Erreur retrait carte équipe:', error);
    res.status(error.status || 500).json({ message: error.message || 'Erreur serveur' });
  }
});

router.get('/packs', async (_req, res) => {
  try {
    const packs = await recupererTypesPacks();
    res.json(packs);
  } catch (error) {
    console.error('Erreur packs:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.post('/packs/:id/ouvrir', async (req, res) => {
  try {
    const packId = Number(req.params.id);
    if (!packId) {
      return res.status(400).json({ message: 'Pack invalide' });
    }

    const uuid = crypto.randomUUID();
    const result = await creerJobOuverturePack(req.session.id, packId, uuid);
    res.json(result);
  } catch (error) {
    console.error('Erreur ouverture pack:', error);
    res.status(500).json({ message: error.message || 'Erreur pack' });
  }
});

router.get('/packs/:uuid', async (req, res) => {
  try {
    const job = await recupererJobPack(req.params.uuid);
    if (!job) {
      return res.status(404).json({ message: 'UUID inconnu' });
    }
    if (job.statut === 'PENDING') {
      return res.status(206).json(job);
    }
    res.json(job);
  } catch (error) {
    console.error('Erreur récupération pack:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.get('/marketplace', async (req, res) => {
  try {
    const annonces = await recupererAnnoncesMarketplace();
    res.json(annonces);
  } catch (error) {
    console.error('Erreur marketplace:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

router.post('/marketplace/annonces', async (req, res) => {
  try {
    const carteId = Number(req.body.carteId);
    const prix = Number(req.body.prix);
    const result = await creerAnnonceMarketplace(req.session.id, carteId, prix);
    res.status(201).json(result);
  } catch (error) {
    console.error('Erreur mise en vente:', error);
    if (String(error.message || '').includes('Duplicate')) {
      return res.status(400).json({ message: 'Cette carte est déjà en vente' });
    }
    res.status(error.status || 500).json({ message: error.message || 'Erreur serveur' });
  }
});

router.delete('/marketplace/annonces/:id', async (req, res) => {
  try {
    const result = await supprimerAnnonceMarketplace(req.session.id, Number(req.params.id));
    res.json(result);
  } catch (error) {
    console.error('Erreur suppression annonce:', error);
    res.status(error.status || 500).json({ message: error.message || 'Erreur serveur' });
  }
});

router.post('/marketplace/annonces/:id/acheter', async (req, res) => {
  try {
    const result = await acheterAnnonceMarketplace(req.session.id, Number(req.params.id));
    res.json(result);
  } catch (error) {
    console.error('Erreur achat annonce:', error);
    res.status(error.status || 500).json({ message: error.message || 'Erreur serveur' });
  }
});

export default router;