import { Router } from 'express';
import { recupererAnnoncesMarche, vendreCarte, acheterCarte } from '../controllers/marketplaceController.js';

const router = Router();

// Routes du marché.
router.get('/listings', recupererAnnoncesMarche);
router.post('/sell', vendreCarte);
router.post('/buy', acheterCarte);

export default router;
