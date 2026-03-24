import { Router } from 'express';
import * as materialGroupsCtrl from '../controllers/materialGroupsController';
import * as sparePartsCtrl from '../controllers/sparePartsController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { tenantIsolation } from '../middleware/tenantIsolation';

const router = Router();
router.use(authenticate, tenantIsolation);

// ── Grupa materiałowa ─────────────────────────────────────────────────────
router.patch('/:id', requireRole('ANALYST', 'ADMIN'), materialGroupsCtrl.update);
router.delete('/:id', requireRole('ANALYST', 'ADMIN'), materialGroupsCtrl.remove);

// ── Części zamienne (zagnieżdżone) ────────────────────────────────────────
router.get('/:groupId/spare-parts', sparePartsCtrl.list);
router.post('/:groupId/spare-parts', requireRole('ANALYST', 'ADMIN'), sparePartsCtrl.create);

export default router;
