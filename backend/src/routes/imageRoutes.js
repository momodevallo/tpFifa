import { Router } from 'express';
import fetch from 'node-fetch';
import { trouverJoueurParId } from '../models/playerModel.js';

const router = Router();

// Proxy d'image joueur pour éviter les problèmes de CORS côté front.
router.get('/player-image/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const joueur = await trouverJoueurParId(id);

        if (!joueur || !joueur.image_url) {
            return res.status(404).send('Image non trouvée');
        }

        const reponseDistante = await fetch(joueur.image_url);

        if (!reponseDistante.ok) {
            console.error(
                'Erreur fetch image distante:',
                reponseDistante.status,
                reponseDistante.statusText
            );
            return res.status(reponseDistante.status).send('Impossible de récupérer l’image distante');
        }

        res.setHeader(
            'Content-Type',
            reponseDistante.headers.get('content-type') || 'image/png'
        );

        const buffer = await reponseDistante.arrayBuffer();
        res.send(Buffer.from(buffer));
    } catch (erreur) {
        console.error('Erreur proxy image:', erreur);
        res.status(500).send('Erreur serveur image');
    }
});

export default router;
