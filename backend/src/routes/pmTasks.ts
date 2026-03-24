import { Router } from 'express';
import * as pmTasksCtrl from '../controllers/pmTasksController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { tenantIsolation } from '../middleware/tenantIsolation';

const router = Router();
router.use(authenticate, tenantIsolation);

// ── PMTask ─────────────────────────────────────────────────────────────────
router.patch('/:id', requireRole('ANALYST', 'ADMIN'), pmTasksCtrl.updatePMTaskCtrl);
router.delete('/:id', requireRole('ANALYST', 'ADMIN'), pmTasksCtrl.removePMTaskCtrl);

export default router;
