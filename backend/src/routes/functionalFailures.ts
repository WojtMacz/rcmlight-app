import { Router } from 'express';
import * as functionsCtrl from '../controllers/functionsController';
import * as physicalFailuresCtrl from '../controllers/physicalFailuresController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { tenantIsolation } from '../middleware/tenantIsolation';

const router = Router();
router.use(authenticate, tenantIsolation);

// ── FunctionalFailure ──────────────────────────────────────────────────────
router.patch('/:id', requireRole('ANALYST', 'ADMIN'), functionsCtrl.updateFF);
router.delete('/:id', requireRole('ANALYST', 'ADMIN'), functionsCtrl.removeFF);

// ── PhysicalFailures (zagnieżdżone pod błędem funkcjonalnym) ──────────────
router.get('/:ffId/physical-failures', physicalFailuresCtrl.listPF);
router.post(
  '/:ffId/physical-failures',
  requireRole('ANALYST', 'ADMIN'),
  physicalFailuresCtrl.createPF,
);

export default router;
