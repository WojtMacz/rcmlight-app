import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { tenantIsolation } from '../middleware/tenantIsolation';
import { requireRole } from '../middleware/requireRole';
import * as companyCtrl from '../controllers/companyController';

const router = Router();

router.use(authenticate, tenantIsolation);

router.get('/', companyCtrl.getCompany);
router.patch('/', requireRole('ADMIN'), companyCtrl.patchCompany);

export default router;
