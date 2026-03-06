import { Router } from 'express';
import { getMyCards } from '../controllers/cartesController.js';

const router = Router();

router.get('/my-cards', getMyCards);

export default router;
