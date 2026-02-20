import { Router } from 'express';
import { getMarketListings, sellCard, buyCard } from '../controllers/marketplaceController.js';

const router = Router();

router.get('/listings', getMarketListings);
router.post('/sell', sellCard);
router.post('/buy', buyCard);

export default router;
