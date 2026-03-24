import { Router } from 'express';
import * as physicalFailuresCtrl from '../controllers/physicalFailuresController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { tenantIsolation } from '../middleware/tenantIsolation';

const router = Router();
router.use(authenticate, tenantIsolation);

// ── PhysicalFailure ────────────────────────────────────────────────────────
router.patch('/:id', requireRole('ANALYST', 'ADMIN'), physicalFailuresCtrl.updatePF);
router.delete('/:id', requireRole('ANALYST', 'ADMIN'), physicalFailuresCtrl.removePF);

// ── FailureCauses (zagnieżdżone pod awarią fizyczną) ─────────────────────
router.get('/:pfId/causes', physicalFailuresCtrl.listCausesCtrl);
router.post('/:pfId/causes', requireRole('ANALYST', 'ADMIN'), physicalFailuresCtrl.createCauseCtrl);

export default router;
