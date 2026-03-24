import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/__tests__/**', 'src/server.ts'],
    },
    // Ustaw zmienne środowiskowe dla testów
    env: {
      NODE_ENV: 'test',
      JWT_ACCESS_SECRET: 'test-access-secret-min-32-chars-xxxx',
      JWT_REFRESH_SECRET: 'test-refresh-secret-min-32-chars-xxxx',
      JWT_ACCESS_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '7d',
      CORS_ORIGINS: 'http://localhost:5173',
      RATE_LIMIT_MAX: '1000',
      RATE_LIMIT_AUTH_MAX: '1000',
    },
  },
});
