import { Router } from 'express';
import * as usersController from '../controllers/usersController';
import * as profileController from '../controllers/profileController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { tenantIsolation } from '../middleware/tenantIsolation';

const router = Router();

// Wszystkie trasy wymagają autentykacji + izolacji tenanta
router.use(authenticate, tenantIsolation);

// Profil bieżącego użytkownika (każdy zalogowany)
router.patch('/me', profileController.patchMe);
router.post('/me/password', profileController.changeMyPassword);

// Tylko ADMIN zarządza użytkownikami
router.get('/', requireRole('ADMIN'), usersController.listUsers);
router.patch('/:id', requireRole('ADMIN'), usersController.patchUser);
router.delete('/:id', requireRole('ADMIN'), usersController.deleteUser);
router.post('/:id/activate', requireRole('ADMIN'), usersController.activateUserCtrl);

export default router;
