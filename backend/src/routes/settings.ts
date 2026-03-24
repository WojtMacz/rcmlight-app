import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { tenantIsolation } from '../middleware/tenantIsolation';
import {
  getCriteriaCtrl,
  updateCriterionCtrl,
  resetCriteriaCtrl,
  getTemplatesCtrl,
  createTemplateCtrl,
  updateTemplateCtrl,
  deleteTemplateCtrl,
} from '../controllers/settingsController';

const router = Router();

router.use(authenticate, tenantIsolation);

// Criticality criteria — read: all roles; write: ADMIN only
router.get('/criticality-criteria', getCriteriaCtrl);
router.patch('/criticality-criteria/:id', requireRole('ADMIN'), updateCriterionCtrl);
router.post('/criticality-criteria/reset', requireRole('ADMIN'), resetCriteriaCtrl);

// Material group templates — read: all roles; write: ADMIN only
router.get('/material-groups-dictionary', getTemplatesCtrl);
router.post('/material-groups-dictionary', requireRole('ADMIN'), createTemplateCtrl);
router.patch('/material-groups-dictionary/:id', requireRole('ADMIN'), updateTemplateCtrl);
router.delete('/material-groups-dictionary/:id', requireRole('ADMIN'), deleteTemplateCtrl);

export default router;
