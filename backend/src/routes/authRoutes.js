import express from 'express';
import { sessions } from '../state/runtime.js';
import { attendJson } from '../services/requestService.js';
import { creerSession, poserCookieSession, supprimerCookieSession } from '../services/sessionService.js';
import { trouverUtilisateurParPseudo, gererEchecAuth, inscrireUtilisateur } from '../services/authService.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const pseudo = String(req.body.pseudo || req.body.username || '').trim();
    const mdp = String(req.body.mdp || req.body.password || '');

    if (!pseudo || !mdp) {
      return await gererEchecAuth(req, res, 'Pseudo ou mot de passe manquant');
    }

    const user = await trouverUtilisateurParPseudo(pseudo);
    if (!user) {
      return await gererEchecAuth(req, res, 'Identifiants invalides');
    }

    const bcrypt = await import('bcrypt');
    const ok = await bcrypt.default.compare(mdp, user.mdp);
    if (!ok) {
      return await gererEchecAuth(req, res, 'Identifiants invalides');
    }

    const sid = await creerSession({ id: Number(user.id), pseudo: user.pseudo });
    await poserCookieSession(res, sid);

    if (await attendJson(req)) {
      return res.json({ message: 'Connexion réussie', userId: Number(user.id), pseudo: user.pseudo });
    }

    return res.redirect('/accueil.html');
  } catch (error) {
    console.error('Erreur login:', error);
    if (await attendJson(req)) {
      return res.status(500).json({ message: 'Erreur serveur' });
    }
    return res.redirect('/login?error');
  }
});

router.post('/logout', async (req, res) => {
  const sid = req.cookies.sid;
  if (sid) sessions.delete(sid);
  await supprimerCookieSession(res);
  res.json({ message: 'Déconnexion réussie' });
});

router.post('/api/inscription', async (req, res) => {
  const pseudo = String(req.body.pseudo || '').trim();
  const mdp = String(req.body.mdp || '');

  if (!pseudo || !mdp) {
    return res.status(400).json({ message: 'Pseudo et mot de passe obligatoires' });
  }
  if (!/^[a-zA-Z0-9]+$/.test(pseudo)) {
    return res.status(400).json({ message: 'Le pseudo doit contenir uniquement des lettres et des chiffres' });
  }
  if (mdp.length < 8) {
    return res.status(400).json({ message: 'Mot de passe trop court (min 8 caractères)' });
  }

  try {
    const existing = await trouverUtilisateurParPseudo(pseudo);
    if (existing) {
      return res.status(400).json({ message: 'Ce pseudo existe déjà' });
    }

    const user = await inscrireUtilisateur(pseudo, mdp);
    res.status(201).json(user);
  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({ message: 'Erreur serveur pendant l’inscription' });
  }
});

export default router;