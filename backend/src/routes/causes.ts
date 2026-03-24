import { Router } from 'express';
import * as physicalFailuresCtrl from '../controllers/physicalFailuresController';
import * as criticalityCtrl from '../controllers/criticalityController';
import * as pmTasksCtrl from '../controllers/pmTasksController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { tenantIsolation } from '../middleware/tenantIsolation';

const router = Router();
router.use(authenticate, tenantIsolation);

// ── FailureCause ───────────────────────────────────────────────────────────
router.patch('/:id', requireRole('ANALYST', 'ADMIN'), physicalFailuresCtrl.updateCauseCtrl);
router.delete('/:id', requireRole('ANALYST', 'ADMIN'), physicalFailuresCtrl.removeCauseCtrl);

// ── Criticality (zagnieżdżona pod przyczyną) ──────────────────────────────
router.post(
  '/:causeId/criticality',
  requireRole('ANALYST', 'ADMIN'),
  criticalityCtrl.upsertCriticalityCtrl,
);
router.get('/:causeId/criticality', criticalityCtrl.getCriticalityCtrl);

// ── PMTask (zagnieżdżone pod przyczyną) ───────────────────────────────────
router.post(
  '/:causeId/pm-task',
  requireRole('ANALYST', 'ADMIN'),
  pmTasksCtrl.upsertPMTaskCtrl,
);

export default router;
