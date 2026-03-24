FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma/

# Install ALL deps (including TypeScript/devDeps) for build
RUN npm ci --include=dev

COPY . .
RUN npx prisma generate
RUN npm run build

# Remove devDeps after build (init.js uses only production deps)
RUN npm prune --production

COPY start.sh ./
RUN chmod +x start.sh

ENV NODE_ENV=production
EXPOSE 3001
CMD ["./start.sh"]
