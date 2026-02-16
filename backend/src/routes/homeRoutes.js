import { Router } from 'express';
import path from 'path';
const router = Router();

export default (publicPath) => {
    // les pages html
    router.get('/accueil', (req, res) => {
        res.sendFile(path.join(publicPath,'accueil.html'));
    });

    return router;
};