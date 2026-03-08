import { Router } from 'express';
import path from 'path';
import { inscrireUtilisateur, connecterUtilisateur } from '../controllers/userController.js';

const router = Router();

// Monte les routes d'authentification HTML + API.
export default (publicPath) => {
    router.get('/login', (_req, res) => {
        res.sendFile(path.join(publicPath, 'auth', 'login.html'));
    });

    router.get('/register', (_req, res) => {
        res.sendFile(path.join(publicPath, 'auth', 'register.html'));
    });

    router.post('/register', inscrireUtilisateur);
    router.post('/login', connecterUtilisateur);

    return router;
};
