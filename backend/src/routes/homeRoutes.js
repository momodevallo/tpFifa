import { Router } from 'express';
import path from 'path';
import { requireAuth } from '../middlewares/authGuard.js';

const router = Router();

export default (publicPath) => {
    router.get('/accueil', requireAuth, (req, res) => {
        res.sendFile(path.join(publicPath, 'accueil.html'));
    });

    router.get('/boutique', requireAuth, (req, res) => {
        res.sendFile(path.join(publicPath, 'boutique.html'));
    });

    router.get('/marche', requireAuth, (req, res) => {
        res.sendFile(path.join(publicPath, 'marche.html'));
    });

    router.get('/mes-joueurs', requireAuth, (req, res) => {
        res.sendFile(path.join(publicPath, 'mes-joueurs.html'));
    });

    router.get('/composition', requireAuth, (req, res) => {
        res.sendFile(path.join(publicPath, 'composition.html'));
    });

    return router;
};