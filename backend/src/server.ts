import 'dotenv/config';
import { createApp } from './app';
import { logger } from './utils/logger';

const PORT = parseInt(process.env.PORT ?? '3001', 10);

const app = createApp();

const server = app.listen(PORT, () => {
  logger.info(`RCMLight API running on http://localhost:${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV ?? 'development'}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received — shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', reason);
  server.close(() => process.exit(1));
});
