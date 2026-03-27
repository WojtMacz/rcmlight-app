import { Router } from 'express';
import * as adminCtrl from '../controllers/adminController';

const router = Router();

// Public (own auth)
router.post('/login', adminCtrl.login);

// Protected (super admin token verified inside controller)
router.get('/companies', adminCtrl.getCompanies);
router.post('/companies', adminCtrl.createCompanyHandler);
router.get('/companies/:id', adminCtrl.getCompany);
router.patch('/companies/:id', adminCtrl.updateCompanyHandler);
router.delete('/companies/:id', adminCtrl.deleteCompanyHandler);
router.patch('/companies/:id/toggle-active', adminCtrl.toggleActive);
router.post('/companies/:id/impersonate', adminCtrl.impersonate);
router.post('/companies/:id/users', adminCtrl.addUserHandler);
router.patch('/users/:id', adminCtrl.updateUserHandler);

export default router;
