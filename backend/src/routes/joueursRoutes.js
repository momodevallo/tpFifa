import { Router } from 'express';
import { ouvrirPackJoueur } from '../controllers/joueursController.js';

const router = Router();

// Route qui déclenche l'ouverture d'un pack.
router.post('/open-pack', ouvrirPackJoueur);

export default router;
