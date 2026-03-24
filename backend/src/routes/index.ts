import { Router, Request, Response } from 'express';
import authRoutes from './auth';
import usersRoutes from './users';
import companyRoutes from './company';
import adminRoutes from './admin';
import machinesRoutes from './machines';
import systemsRoutes from './systems';
import assembliesRoutes from './assemblies';
import materialGroupsRoutes from './materialGroups';
import sparePartsRoutes from './spareParts';
import functionsRoutes from './functions';
import functionalFailuresRoutes from './functionalFailures';
import physicalFailuresRoutes from './physicalFailures';
import causesRoutes from './causes';
import pmTasksRoutes from './pmTasks';
import settingsRoutes from './settings';

const router = Router();

// Health check
router.get('/health', (_req: Request, res: Response): void => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'RCMLight API',
    version: '1.0.0',
  });
});

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/company', companyRoutes);
router.use('/admin', adminRoutes);
router.use('/machines', machinesRoutes);
router.use('/systems', systemsRoutes);
router.use('/assemblies', assembliesRoutes);
router.use('/material-groups', materialGroupsRoutes);
router.use('/spare-parts', sparePartsRoutes);
router.use('/functions', functionsRoutes);
router.use('/functional-failures', functionalFailuresRoutes);
router.use('/physical-failures', physicalFailuresRoutes);
router.use('/causes', causesRoutes);
router.use('/pm-tasks', pmTasksRoutes);
router.use('/settings', settingsRoutes);

export default router;
