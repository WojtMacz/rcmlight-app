# ── Stage 1: deps ──────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --ignore-scripts

# ── Stage 2: build ─────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ── Stage 3: production runtime ────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

EXPOSE 3001
CMD ["node", "dist/server.js"]

# ── Dev stage (used by docker-compose.yml) ─────────────────
FROM node:20-alpine AS dev
WORKDIR /app
RUN npm install -g nodemon ts-node
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
EXPOSE 3001
CMD ["npm", "run", "dev"]
