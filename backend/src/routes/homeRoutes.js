import { Router } from 'express';
import path from 'path';

const router = Router();

// Sert la page d'accueil principale.
export default (publicPath) => {
    router.get('/accueil', (_req, res) => {
        res.sendFile(path.join(publicPath, 'accueil.html'));
    });

    return router;
};
