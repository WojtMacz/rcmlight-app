import { Router } from 'express';
import * as assembliesCtrl from '../controllers/assembliesController';
import * as systemsCtrl from '../controllers/systemsController';
import * as functionsCtrl from '../controllers/functionsController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { tenantIsolation } from '../middleware/tenantIsolation';

const router = Router();
router.use(authenticate, tenantIsolation);

// ── Reorder (musi być przed /:id żeby nie złapać 'reorder' jako id) ────────
router.post('/reorder', requireRole('ANALYST', 'ADMIN'), systemsCtrl.reorder);

// ── System ─────────────────────────────────────────────────────────────────
router.patch('/:id', requireRole('ANALYST', 'ADMIN'), systemsCtrl.update);
router.delete('/:id', requireRole('ANALYST', 'ADMIN'), systemsCtrl.remove);

// ── Zespoły (zagnieżdżone pod systemem) ───────────────────────────────────
router.get('/:systemId/assemblies', assembliesCtrl.list);
router.post('/:systemId/assemblies', requireRole('ANALYST', 'ADMIN'), assembliesCtrl.create);

// ── Funkcje systemowe (zagnieżdżone pod systemem) ─────────────────────────
router.post('/:systemId/functions', requireRole('ANALYST', 'ADMIN'), functionsCtrl.createForSystem);

export default router;
