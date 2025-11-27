import { Router } from 'express';

import OrderRoute from './OrderRoute';
import CrewRoute from './CrewRoute';

const router = Router();

router.use('/', OrderRoute);
router.use('/', CrewRoute);

export default router;
