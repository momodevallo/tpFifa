import { Router } from 'express';
import { openPack } from '../controllers/joueursController.js';

const router = Router();

router.post('/open-pack', openPack);

export default router;
