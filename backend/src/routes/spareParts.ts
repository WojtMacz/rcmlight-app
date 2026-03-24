import { Router } from 'express';
import * as sparePartsCtrl from '../controllers/sparePartsController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { tenantIsolation } from '../middleware/tenantIsolation';

const router = Router();
router.use(authenticate, tenantIsolation);

router.patch('/:id', requireRole('ANALYST', 'ADMIN'), sparePartsCtrl.update);
router.delete('/:id', requireRole('ANALYST', 'ADMIN'), sparePartsCtrl.remove);

export default router;
