import { Router } from 'express';
import { recupererMesCartes } from '../controllers/cartesController.js';

const router = Router();

// Route simple pour récupérer les cartes d'un utilisateur.
router.get('/my-cards', recupererMesCartes);

export default router;
