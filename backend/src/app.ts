import cors from 'cors';
import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';
import router from './routes';
import { AppError } from './utils/AppError';

function buildCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS ?? 'http://localhost:5173';
  return raw.split(',').map((s) => s.trim());
}

export function createApp(): Application {
  const app = express();

  // Bezpieczeństwo
  app.use(helmet());

  // CORS — whitelist z .env
  const allowedOrigins = buildCorsOrigins();
  app.use(
    cors({
      origin: (origin, callback) => {
        // Zezwól na żądania bez origin (np. curl, Postman w dev)
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`CORS: origin ${origin} nie jest na liście`));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  // Parsery
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Logowanie HTTP
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  // Rate limiting
  app.use('/api', apiLimiter);

  // Trasy
  app.use('/api/v1', router);

  // 404
  app.use((_req: Request, _res: Response, next: NextFunction) => {
    next(new AppError(404, 'Nie znaleziono zasobu'));
  });

  // Globalny handler błędów
  app.use(errorHandler);

  return app;
}
