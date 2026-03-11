import express from 'express';
import path from 'path';
import { publicPath } from '../config/paths.js';
import pool from '../config/db.js';
import { recupererImageUrlJoueur, recupererImageJoueurCachee, envoyerImageJoueurParDefaut } from '../services/imageService.js';

const router = express.Router();

router.get('/', async (req, res) => {
  res.redirect(req.session ? '/accueil.html' : '/login');
});

router.get('/login', async (_req, res) => {
  res.sendFile(path.join(publicPath, 'auth', 'login.html'));
});

router.get('/register', async (_req, res) => {
  res.sendFile(path.join(publicPath, 'auth', 'register.html'));
});

router.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get('/player-image/:id', async (req, res) => {
  try {
    const playerId = Number(req.params.id);
    if (!playerId) {
      return await envoyerImageJoueurParDefaut(res);
    }

    const imageUrl = await recupererImageUrlJoueur(playerId);

    if (!imageUrl) {
      return await envoyerImageJoueurParDefaut(res);
    }

    const cache = await recupererImageJoueurCachee(playerId, imageUrl);
    if (cache) {
      res.type(cache.contentType);
      return res.send(cache.buffer);
    }

    return await envoyerImageJoueurParDefaut(res);
  } catch (error) {
    console.error('Erreur player-image:', error);
    return await envoyerImageJoueurParDefaut(res);
  }
});

export default router;