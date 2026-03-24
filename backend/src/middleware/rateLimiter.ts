import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '900000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX ?? '100', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Zbyt wiele żądań — spróbuj ponownie za chwilę',
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_AUTH_MAX ?? '10', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Zbyt wiele prób logowania — spróbuj ponownie za 15 minut',
  },
});
