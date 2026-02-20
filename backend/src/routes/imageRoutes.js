import { Router } from 'express';
import fetch from 'node-fetch';
import { findPlayerById } from '../models/playerModel.js';

const router = Router();

router.get('/player-image/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const player = await findPlayerById(id);

        if (!player || !player.image_url) {
            return res.status(404).send('Image non trouvée');
        }

        const remoteRes = await fetch(player.image_url);

        if (!remoteRes.ok) {
            console.error(
                'Erreur fetch image distante:',
                remoteRes.status,
                remoteRes.statusText
            );
            return res
                .status(remoteRes.status)
                .send('Impossible de récupérer l’image distante');
        }

        res.setHeader(
            'Content-Type',
            remoteRes.headers.get('content-type') || 'image/png'
        );

        const buffer = await remoteRes.arrayBuffer();
        res.send(Buffer.from(buffer));
    } catch (err) {
        console.error('Erreur proxy image:', err);
        res.status(500).send('Erreur serveur image');
    }
});

export default router;
