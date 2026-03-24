import { Router } from 'express';
import * as assembliesCtrl from '../controllers/assembliesController';
import * as materialGroupsCtrl from '../controllers/materialGroupsController';
import * as functionsCtrl from '../controllers/functionsController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { tenantIsolation } from '../middleware/tenantIsolation';

const router = Router();
router.use(authenticate, tenantIsolation);

// ── Zespół ────────────────────────────────────────────────────────────────
router.patch('/:id', requireRole('ANALYST', 'ADMIN'), assembliesCtrl.update);
router.delete('/:id', requireRole('ANALYST', 'ADMIN'), assembliesCtrl.remove);

// ── Grupy materiałowe (zagnieżdżone) ──────────────────────────────────────
router.get('/:assemblyId/material-groups', materialGroupsCtrl.list);
router.post(
  '/:assemblyId/material-groups',
  requireRole('ANALYST', 'ADMIN'),
  materialGroupsCtrl.create,
);

// ── Funkcje zespołu (zagnieżdżone pod zespołem) ───────────────────────────
router.post(
  '/:assemblyId/functions',
  requireRole('ANALYST', 'ADMIN'),
  functionsCtrl.createForAssembly,
);

export default router;
