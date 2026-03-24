import { Router } from 'express';
import * as functionsCtrl from '../controllers/functionsController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { tenantIsolation } from '../middleware/tenantIsolation';

const router = Router();
router.use(authenticate, tenantIsolation);

// ── FunctionDef ────────────────────────────────────────────────────────────
router.patch('/:id', requireRole('ANALYST', 'ADMIN'), functionsCtrl.update);
router.delete('/:id', requireRole('ANALYST', 'ADMIN'), functionsCtrl.remove);

// ── FunctionalFailures (zagnieżdżone pod funkcją) ─────────────────────────
router.get('/:functionId/functional-failures', functionsCtrl.listFF);
router.post(
  '/:functionId/functional-failures',
  requireRole('ANALYST', 'ADMIN'),
  functionsCtrl.createFF,
);

export default router;
