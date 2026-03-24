import { Router } from 'express';
import multer from 'multer';
import * as machinesCtrl from '../controllers/machinesController';
import * as systemsCtrl from '../controllers/systemsController';
import * as functionsCtrl from '../controllers/functionsController';
import * as rcmAnalysisCtrl from '../controllers/rcmAnalysisController';
import * as exportCtrl from '../controllers/exportController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { tenantIsolation } from '../middleware/tenantIsolation';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// Wszystkie trasy wymagają auth + tenant isolation
router.use(authenticate, tenantIsolation);

// ── Maszyny ────────────────────────────────────────────────────────────────
router.get('/', machinesCtrl.list);
router.post('/', requireRole('ANALYST', 'ADMIN'), machinesCtrl.create);

router.get('/:id', machinesCtrl.getOne);
router.patch('/:id', requireRole('ANALYST', 'ADMIN'), machinesCtrl.update);
router.delete('/:id', requireRole('ADMIN'), machinesCtrl.remove);

// ── Import / Eksport BOM ───────────────────────────────────────────────────
router.post(
  '/:id/import-bom',
  requireRole('ANALYST', 'ADMIN'),
  upload.single('file'),
  machinesCtrl.importBomHandler,
);
router.get('/:id/export-bom', machinesCtrl.exportBomHandler);

// ── Systemy (zagnieżdżone pod maszyną) ────────────────────────────────────
router.get('/:machineId/systems', systemsCtrl.list);
router.post('/:machineId/systems', requireRole('ANALYST', 'ADMIN'), systemsCtrl.create);

// ── Funkcje (zagnieżdżone pod maszyną) ────────────────────────────────────
router.get('/:machineId/functions', functionsCtrl.listForMachine);

// ── Analiza RCM ────────────────────────────────────────────────────────────
router.get('/:machineId/rcm-analysis', rcmAnalysisCtrl.getFullAnalysis);
router.get('/:machineId/pm-summary', rcmAnalysisCtrl.getPmSummaryCtrl);

// ── Eksport ────────────────────────────────────────────────────────────────
router.get('/:id/export/docx', exportCtrl.exportDocxCtrl);
router.get('/:id/export/xlsx', exportCtrl.exportXlsxCtrl);

export default router;
