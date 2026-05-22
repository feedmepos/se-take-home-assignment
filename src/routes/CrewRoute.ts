import { Router } from 'express';

// Middlewares
import { isAuthenticated } from '../middlewares/authentication';

// Controllers
import CrewController from '../controllers/CrewController';

// Create the router instance
const router = Router();
const crewController = new CrewController();

// Retrieve crew info
router.get(
  '/crews',
  isAuthenticated,
  crewController.getCrews
);

// Retrieve crew info
router.get(
  '/crew',
  isAuthenticated,
  crewController.getCrew
);

// Create crew profile
router.post(
  '/crew',
  isAuthenticated,
  crewController.createCrew
);
export default router;
